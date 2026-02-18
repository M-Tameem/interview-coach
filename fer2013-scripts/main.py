import os
import json
import argparse
from datetime import datetime

import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.layers import GlobalAveragePooling2D, Dense, Input, Dropout
from tensorflow.keras.models import Model, load_model
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import ReduceLROnPlateau, EarlyStopping, ModelCheckpoint, CSVLogger


EMOTION_CLASSES = ["angry", "disgust", "fear", "happy", "sad", "surprise", "neutral"]


def setup_accelerator():
    """Print available accelerators. Enable GPU memory growth if GPU exists."""
    gpus = tf.config.list_physical_devices("GPU")
    if gpus:
        print("GPUs available:")
        for gpu in gpus:
            print(f"  - {gpu.name}")
        try:
            for gpu in gpus:
                tf.config.experimental.set_memory_growth(gpu, True)
        except RuntimeError as e:
            print("Could not set GPU memory growth:", e)
    else:
        print("No GPU found. Running on CPU.")
    # TPU not handled here (keep this script simple + portable).


def ensure_dir(path: str):
    os.makedirs(path, exist_ok=True)


def build_model(input_shape, num_classes, head_units=128, dropout=0.5):
    """
    Build MobileNetV2 feature extractor + small classification head.
    """
    base_model = MobileNetV2(
        input_shape=input_shape,
        include_top=False,
        weights="imagenet"
    )
    base_model.trainable = False  # warmup phase

    inputs = Input(shape=input_shape)
    x = base_model(inputs, training=False)
    x = GlobalAveragePooling2D()(x)
    x = Dense(head_units, activation="relu")(x)
    x = Dropout(dropout)(x)
    outputs = Dense(num_classes, activation="softmax")(x)

    model = Model(inputs, outputs, name="fer_mobilenetv2")
    return model, base_model


def make_generators(train_dir, test_dir, image_size, batch_size, aug_strength="medium"):
    """
    We use color_mode='rgb' so grayscale images get replicated to 3 channels.
    """
    if aug_strength == "light":
        train_datagen = ImageDataGenerator(
            rescale=1.0 / 255,
            rotation_range=10,
            zoom_range=0.1,
            horizontal_flip=True,
            fill_mode="nearest",
        )
    elif aug_strength == "heavy":
        train_datagen = ImageDataGenerator(
            rescale=1.0 / 255,
            rotation_range=20,
            width_shift_range=0.2,
            height_shift_range=0.2,
            shear_range=0.15,
            zoom_range=0.25,
            brightness_range=[0.75, 1.25],
            horizontal_flip=True,
            fill_mode="nearest",
        )
    else:  # medium
        train_datagen = ImageDataGenerator(
            rescale=1.0 / 255,
            rotation_range=15,
            width_shift_range=0.1,
            height_shift_range=0.1,
            zoom_range=0.2,
            horizontal_flip=True,
            fill_mode="nearest",
        )

    test_datagen = ImageDataGenerator(rescale=1.0 / 255)

    train_gen = train_datagen.flow_from_directory(
        train_dir,
        target_size=image_size,
        color_mode="rgb",
        batch_size=batch_size,
        class_mode="categorical",
        classes=EMOTION_CLASSES,  # enforce class order
        shuffle=True,
    )

    test_gen = test_datagen.flow_from_directory(
        test_dir,
        target_size=image_size,
        color_mode="rgb",
        batch_size=batch_size,
        class_mode="categorical",
        classes=EMOTION_CLASSES,
        shuffle=False,
    )

    return train_gen, test_gen


def save_metadata(models_dir, train_gen, args, history_paths):
    meta = {
        "timestamp": datetime.now().isoformat(),
        "classes": EMOTION_CLASSES,
        "class_indices": train_gen.class_indices,
        "image_size": list(args.image_size),
        "batch_size": args.batch_size,
        "warmup_epochs": args.warmup_epochs,
        "finetune_epochs": args.finetune_epochs,
        "finetune_at": args.finetune_at,
        "lr_warmup": args.lr_warmup,
        "lr_finetune": args.lr_finetune,
        "augment": args.augment,
        "resume_path": args.resume,
        "history_logs": history_paths,
    }
    with open(os.path.join(models_dir, "metadata.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)
    print(f"Saved metadata -> {os.path.join(models_dir, 'metadata.json')}")


def compile_for_phase(model, lr):
    model.compile(
        optimizer=Adam(learning_rate=lr),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )


def set_finetune(base_model, finetune_at: int):
    """
    Unfreeze base_model, but keep earlier layers frozen.
    """
    base_model.trainable = True
    for i, layer in enumerate(base_model.layers):
        layer.trainable = i >= finetune_at


def main():
    parser = argparse.ArgumentParser(description="Train FER emotion classifier (MobileNetV2) for TFJS deployment.")
    parser.add_argument("--train_dir", default="train", type=str)
    parser.add_argument("--test_dir", default="test", type=str)
    parser.add_argument("--models_dir", default="models", type=str)
    parser.add_argument("--image_size", nargs=2, default=[48, 48], type=int)
    parser.add_argument("--batch_size", default=32, type=int)

    parser.add_argument("--warmup_epochs", default=20, type=int)
    parser.add_argument("--finetune_epochs", default=10, type=int)
    parser.add_argument("--finetune_at", default=104, type=int, help="Layer index in MobileNetV2 to start unfreezing from.")

    parser.add_argument("--lr_warmup", default=1e-4, type=float)
    parser.add_argument("--lr_finetune", default=1e-5, type=float)

    parser.add_argument("--augment", default="medium", choices=["light", "medium", "heavy"])
    parser.add_argument("--resume", default="", type=str, help="Path to an existing model (.keras or .h5) to continue training from.")
    parser.add_argument("--skip_warmup", action="store_true", help="Skip warmup phase if resuming and you only want finetune+callbacks.")

    args = parser.parse_args()

    setup_accelerator()

    image_size = (args.image_size[0], args.image_size[1])
    input_shape = (image_size[0], image_size[1], 3)

    train_dir = os.path.abspath(args.train_dir)
    test_dir = os.path.abspath(args.test_dir)

    if not os.path.isdir(train_dir):
        raise FileNotFoundError(f"train_dir not found: {train_dir}")
    if not os.path.isdir(test_dir):
        raise FileNotFoundError(f"test_dir not found: {test_dir}")

    models_dir = os.path.abspath(args.models_dir)
    ensure_dir(models_dir)

    train_gen, test_gen = make_generators(train_dir, test_dir, image_size, args.batch_size, args.augment)

    # Callbacks
    best_keras_path = os.path.join(models_dir, "best.keras")
    best_h5_path = os.path.join(models_dir, "best.h5")

    callbacks = [
        ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=3, verbose=1, min_lr=1e-7),
        EarlyStopping(monitor="val_loss", patience=6, verbose=1, restore_best_weights=True),
        ModelCheckpoint(best_keras_path, monitor="val_loss", save_best_only=True, verbose=1),
        CSVLogger(os.path.join(models_dir, "train_log.csv"), append=True),
    ]

    # Load or build
    if args.resume:
        resume_path = os.path.abspath(args.resume)
        print(f"Resuming from: {resume_path}")
        model = load_model(resume_path)
        # Rebuild base_model reference for finetuning control:
        # We locate the MobileNetV2 block by name.
        base_model = None
        for layer in model.layers:
            if "mobilenetv2" in layer.name.lower():
                base_model = layer
                break
        if base_model is None:
            raise RuntimeError("Could not find MobileNetV2 base inside loaded model. Did you load the right model?")
    else:
        model, base_model = build_model(input_shape, num_classes=len(EMOTION_CLASSES), head_units=128, dropout=0.5)

    model.summary()

    history_paths = []

    # Phase 1: warmup (train head only)
    if not args.skip_warmup and args.warmup_epochs > 0:
        print("\n=== PHASE 1: WARMUP (base frozen) ===")
        # Freeze base (in case resume loaded it unfrozen)
        base_model.trainable = False
        compile_for_phase(model, args.lr_warmup)

        hist1 = model.fit(
            train_gen,
            epochs=args.warmup_epochs,
            validation_data=test_gen,
            callbacks=callbacks,
        )
        history_paths.append(os.path.join(models_dir, "train_log.csv"))

    # Phase 2: finetune
    if args.finetune_epochs > 0:
        print("\n=== PHASE 2: FINETUNE (partial unfreeze) ===")
        set_finetune(base_model, args.finetune_at)
        compile_for_phase(model, args.lr_finetune)

        hist2 = model.fit(
            train_gen,
            epochs=args.finetune_epochs,
            validation_data=test_gen,
            callbacks=callbacks,
        )
        history_paths.append(os.path.join(models_dir, "train_log.csv"))

    # Save final artifacts
    print("\nSaving final model snapshots...")
    model.save(os.path.join(models_dir, "final.keras"))
    model.save(best_h5_path)  # for TFJS converter convenience
    print(f"Saved -> {os.path.join(models_dir, 'final.keras')}")
    print(f"Saved -> {best_h5_path}")

    # Evaluate
    print("\nEvaluating best model (Keras) on test...")
    best_model = load_model(best_keras_path)
    loss, acc = best_model.evaluate(test_gen, verbose=1)
    print(f"Test loss: {loss:.4f} | Test acc: {acc:.4f}")

    save_metadata(models_dir, train_gen, args, history_paths)


if __name__ == "__main__":
    main()
