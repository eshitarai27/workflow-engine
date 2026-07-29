import { createContext, useContext } from "react";

export const NewWorkflowDialogContext = createContext<() => void>(() => {});

export function useNewWorkflowDialog() {
  return useContext(NewWorkflowDialogContext);
}
