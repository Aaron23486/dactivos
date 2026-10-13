"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { OperationResult } from "@/app/actions/operations";

export type Field = {
  name:string; label:string; type?:"text"|"textarea"|"select"|"checkbox";
  required?:boolean; minLength?:number; maxLength?:number;
  options?: {value:string,label:string}[];
  initial?:string; placeholder?:string; readonly?:boolean;
};
export type ActionFormProps = {
  title:string; description?:string; trigger:string; submitLabel?:string;
  fields:Field[]; action:(form:FormData)=>Promise<OperationResult>;
  hidden?: Record<string,string>; disabled?:boolean; warning?:string;
  small?:boolean;
};

const fieldClass = "mt-1.5 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-cyan-400 focus-visible:ring-2 focus-visible:ring-cyan-400/25 disabled:opacity-60";

export function ActionForm({title,description,trigger,submitLabel="Guardar",fields,action,hidden={},disabled=false,warning,small}:ActionFormProps) {
  const [open,setOpen] = useState(false);
  const [error,setError] = useState<string|null>(null);
  const [busy,startTransition] = useTransition();
  const router = useRouter();
  async function handleSubmit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const fd = new FormData(event.currentTarget);
    for (const [key,value] of Object.entries(hidden)) fd.set(key,value);
    setError(null);
    startTransition(async () => {
      try {
        const result = await action(fd);
        if (!result.ok) {setError(result.message);return;}
        setOpen(false);
        router.refresh();
      } catch {setError("La solicitud no pudo completarse. Comprueba la sesión y vuelve a consultar el estado antes de reintentar.");}
    });
  }
  return <>
    <button type="button" disabled={disabled} onClick={()=>{setError(null);setOpen(true);}}
      className={small ? "inline-flex min-h-9 items-center rounded-lg border border-border bg-secondary/60 px-3 text-xs font-semibold text-slate-200 hover:border-cyan-400/45 hover:bg-accent disabled:opacity-50" : "inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground shadow-[0_8px_22px_-14px_rgba(6,182,212,.95)] hover:bg-cyan-300 disabled:opacity-50"}>
      {trigger}
    </button>
    <Dialog open={open} onOpenChange={(value)=>{if (!busy) {setOpen(value);setError(null);}}}>
      <DialogContent className="max-h-[88dvh] w-full overflow-y-auto border-border bg-card shadow-2xl sm:max-w-lg">
        <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description ?? "Revisa los datos antes de confirmar."}</DialogDescription></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map(field=><label key={field.name} className="block text-sm font-medium">
            {field.type === "checkbox" ? <span className="flex items-start gap-2"><input type="checkbox" name={field.name} value="yes" required={field.required} className="mt-1 size-4"/><span>{field.label}</span></span> : <>
              <span>{field.label}{field.required ? " *" : ""}</span>
              {field.type === "textarea" ? <textarea name={field.name} defaultValue={field.initial ?? ""} required={field.required} minLength={field.minLength} maxLength={field.maxLength} rows={3} placeholder={field.placeholder} className={fieldClass+" h-auto py-2"}/> : field.type === "select" ?
                <select name={field.name} defaultValue={field.initial ?? ""} required={field.required} className={fieldClass}>
                  <option value="">Seleccionar...</option>
                  {(field.options ?? []).map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                </select> : <input name={field.name} type="text" defaultValue={field.initial ?? ""} required={field.required} minLength={field.minLength} maxLength={field.maxLength} placeholder={field.placeholder} readOnly={field.readonly} className={fieldClass}/>
              }
            </>}
          </label>)}
          {warning && <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">{warning}</p>}
          {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
          <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
            <button disabled={busy} type="button" onClick={()=>setOpen(false)} className="min-h-10 rounded-lg border border-border bg-secondary/50 px-4 text-sm hover:bg-accent">Cancelar</button>
            <button disabled={busy} type="submit" className="min-h-10 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground hover:bg-cyan-300 disabled:opacity-50">{busy ? "Procesando..." : submitLabel}</button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  </>;
}
