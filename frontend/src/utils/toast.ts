import { toast } from "react-hot-toast";

type ToastType = "success" | "error" | "info" | "loading";

export const showToast = (
  message: string,
  type: ToastType = "info",
  duration: number = 3000,
) => {
  const options = {
    duration,
    position: "bottom-right" as const,
  };

  switch (type) {
    case "success":
      toast.success(message, options);
      break;
    case "error":
      toast.error(message, options);
      break;
    case "loading":
      toast.loading(message, options);
      break;
    default:
      toast(message, options);
  }
};

export default showToast;
