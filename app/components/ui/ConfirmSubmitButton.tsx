"use client";

import type { ComponentProps } from "react";

import { Button } from "./Button";

type ConfirmSubmitButtonProps = Omit<ComponentProps<typeof Button>, "type" | "onClick"> & {
  message: string;
};

export function ConfirmSubmitButton({ message, ...props }: ConfirmSubmitButtonProps) {
  return (
    <Button
      {...props}
      type="submit"
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    />
  );
}
