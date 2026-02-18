import os
import subprocess
import argparse

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--keras_h5", default="models/best.h5")
    parser.add_argument("--out_dir", default="tfjs_model")
    args = parser.parse_args()

    keras_h5 = os.path.abspath(args.keras_h5)
    out_dir = os.path.abspath(args.out_dir)
    os.makedirs(out_dir, exist_ok=True)

    if not os.path.isfile(keras_h5):
        raise FileNotFoundError(f"Missing model file: {keras_h5}")

    cmd = [
        "tensorflowjs_converter",
        "--input_format=keras",
        keras_h5,
        out_dir
    ]
    print("Running:", " ".join(cmd))
    subprocess.check_call(cmd)
    print(f"TFJS model written to: {out_dir}")

if __name__ == "__main__":
    main()
