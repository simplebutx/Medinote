import Input from "./Input";
import type { InputHTMLAttributes } from "react";

interface PharmInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  errorMessage?: string;
}

function PharmInput(props: PharmInputProps) {
  return <Input colorScheme="emerald" {...props} />;
}

export default PharmInput;
