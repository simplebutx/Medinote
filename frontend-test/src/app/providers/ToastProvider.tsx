import { Toaster } from "react-hot-toast";

function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 2500,
      }}
    />
  );
}

export default ToastProvider;