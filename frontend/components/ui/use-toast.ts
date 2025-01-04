"use client"

import * as React from "react"

type ToastVariant = "default" | "destructive" | "success"

interface Toast {
  id?: string
  title?: string
  description?: string
  action?: React.ReactNode
  variant?: ToastVariant
  dismiss?: () => void
}

const TOAST_LIMIT = 3
const TOAST_REMOVE_DELAY = 1000000

type State = {
  toasts: Toast[]
}

const initialState: State = { toasts: [] }

export function reducer(state: State, action: ToastActionType): State {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }
    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }
    case "DISMISS_TOAST": {
      const { toastId } = action

      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== toastId),
      }
    }
    default:
      return state
  }
}

type ToastActionType =
  | {
      type: "ADD_TOAST"
      toast: Toast
    }
  | {
      type: "UPDATE_TOAST"
      toast: Toast
    }
  | {
      type: "DISMISS_TOAST"
      toastId?: string
    }

export const ToastContext = React.createContext<{
  toasts: Toast[]
  toast: (props: Toast) => { id: string; dismiss: () => void }
}>({
  toasts: [],
  toast: () => ({ id: '', dismiss: () => {} })
})

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(reducer, initialState)

  const toast = React.useCallback(
    ({ ...props }: Toast) => {
      const id = props.id || crypto.randomUUID()

      const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

      dispatch({
        type: "ADD_TOAST",
        toast: {
          ...props,
          id,
          dismiss,
        },
      })

      return {
        id,
        dismiss,
      }
    },
    [dispatch]
  )

  return React.createElement(
    ToastContext.Provider,
    { value: { toasts: state.toasts, toast } },
    children
  )
}

export function Toaster() {
  const { toasts } = React.useContext(ToastContext)

  return React.createElement(
    'div',
    { className: "fixed top-4 right-4 z-50" },
    toasts.map(({ id, title, description, variant = "default", action, dismiss }) =>
      React.createElement('div',
        {
          key: id,
          className: `
            p-4 mb-2 rounded-lg shadow-lg
            ${variant === "destructive" ? "bg-red-500 text-white" :
              variant === "success" ? "bg-green-500 text-white" :
              "bg-gray-800 text-white"}
          `
        },
        [
          title && React.createElement('div', { className: "font-bold" }, title),
          description && React.createElement('div', {}, description),
          action && React.createElement('div', { className: "mt-2" }, action)
        ]
      )
    )
  )
}

export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export default useToast
