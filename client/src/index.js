import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';

// Register the WebGL backend
tf.setBackend('webgl').then(() => {
  console.log('TensorFlow.js backend set to WebGL');
}).catch(error => {
  console.error('Failed to set TensorFlow.js backend:', error);
});

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);