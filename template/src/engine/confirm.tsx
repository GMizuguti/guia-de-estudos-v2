/* Confirmação com AlertDialog (substitui window.confirm): const ok = await confirm({ title, description }) */
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface Ask { title: string; description?: string; action?: string; destructive?: boolean }
const Ctx = createContext<(a: Ask) => Promise<boolean>>(async () => false)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [ask, setAsk] = useState<Ask | null>(null)
  const resolver = useRef<(v: boolean) => void>(() => {})
  const confirm = useCallback((a: Ask) => new Promise<boolean>((res) => { resolver.current = res; setAsk(a) }), [])
  const close = (v: boolean) => { resolver.current(v); setAsk(null) }
  return (
    <Ctx.Provider value={confirm}>
      {children}
      <AlertDialog open={!!ask} onOpenChange={(o) => { if (!o) close(false) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{ask?.title}</AlertDialogTitle>
            {ask?.description && <AlertDialogDescription className="whitespace-pre-line">{ask.description}</AlertDialogDescription>}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => close(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant={ask?.destructive ? "destructive" : "default"} onClick={() => close(true)}>{ask?.action ?? "Confirmar"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Ctx.Provider>
  )
}

export const useConfirm = () => useContext(Ctx)
