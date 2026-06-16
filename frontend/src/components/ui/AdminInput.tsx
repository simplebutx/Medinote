import Input from "./Input";
import type { InputHTMLAttributes } from "react";

interface AdminInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  errorMessage?: string;
}

function AdminInput(props: AdminInputProps) {
  return <Input colorScheme="slate" {...props} />;
}

export default AdminInput;
