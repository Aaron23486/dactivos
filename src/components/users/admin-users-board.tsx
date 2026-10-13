"use client";

import { useMemo, useState } from "react";
import type { ManagedUser } from "@/lib/users/contracts";
import { userStatus } from "@/lib/users/contracts";
import { dateTime } from "@/lib/operations/contracts";
import { ActionForm } from "@/components/operations/action-form";
import { setUserAccess } from "@/app/actions/users";
import { inviteUser } from "@/app/actions/invitations";

const selectStyle = "min-h-10 w-full rounded-md border bg-background px-3 text-sm";

export function AdminUsersBoard({ users, error, actorId }: { users: ManagedUser[]; error: string | null; actorId: string }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const list = useMemo(() => users.filter(user => {
    const matchesText = `${user.email ?? ""} ${user.id} ${user.role ?? ""}`.toLocaleLowerCase()
      .includes(query.trim().toLocaleLowerCase());
    const matchesFilter = filter === "ALL" || filter === userStatus(user) || filter === user.role;
    return matchesText && matchesFilter;
  }), [users, query, filter]);

  return <main className="space-y-6">
    <header className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Administración · 07B-2</p>
      <h1 className="text-3xl font-bold tracking-tight">Usuarios del sistema</h1>
      <p className="max-w-3xl text-sm text-muted-foreground">
        Directorio autorizado de cuentas Supabase Auth y perfiles DACTIVOS.
        Los empleados que reciben equipos no son usuarios de inicio de sesión.
      </p>
    </header>
    <section className="rounded-xl border bg-card p-5"><h2 className="font-semibold">Invitaciones a nuevas cuentas</h2>
      <p className="mt-1 text-sm text-muted-foreground">Envía una invitación a ADMIN o SECURITY. El perfil inicia inactivo y requiere activación después de confirmar el correo.</p>
      <div className="mt-4"><ActionForm trigger="+ Invitar usuario" title="Invitación segura" action={inviteUser} submitLabel="Enviar invitación"
      fields={[
        {name:"email",label:"Correo electrónico",required:true,maxLength:254},
        {name:"role",label:"Rol inicial",type:"select",required:true,options:[{value:"SECURITY",label:"SECURITY"},{value:"ADMIN",label:"ADMIN"}]},
        {name:"reason",label:"Justificación auditada (10–500 caracteres)",type:"textarea",required:true,minLength:10,maxLength:500},
        {name:"confirm",label:"Confirmo la invitación y la asignación del rol",type:"checkbox",required:true},
      ]} warning="Requiere desplegar dactivos-invite en el mismo Supabase. Las claves privilegiadas permanecen exclusivamente en la Edge Function."/></div></section>
    {error ? (
      <section role="alert" className="rounded-lg border border-destructive/40 p-5 text-sm text-destructive">
        <p className="font-semibold">No fue posible obtener el directorio.</p>
        <p className="mt-2">{error}</p>
      </section>
    ) : <>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Cuentas visibles", users.length],
          ["ADMIN activos", users.filter(u => u.role === "ADMIN" && u.is_active === true).length],
          ["SECURITY activos", users.filter(u => u.role === "SECURITY" && u.is_active === true).length],
        ].map(([label,value]) =>
          <section key={String(label)} className="rounded-xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
          </section>)}
      </div>
      <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="space-y-3 p-5">
          <h2 className="font-semibold">Directorio de acceso</h2>
          <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
            <input aria-label="Buscar usuarios" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Buscar correo, ID o rol" className={selectStyle}/>
            <select aria-label="Filtrar usuarios" value={filter} onChange={e => setFilter(e.target.value)} className={selectStyle}>
              <option value="ALL">Todos</option><option value="ADMIN">ADMIN</option>
              <option value="SECURITY">SECURITY</option><option value="ACTIVE">Activos</option>
              <option value="INACTIVE">Inactivos</option><option value="UNLINKED">Sin perfil válido</option>
            </select>
          </div>
          <p className="text-xs text-muted-foreground">{list.length} de {users.length} cuentas visibles.
            {users.length >= 500 ? " Se alcanzó el límite de 500 cuentas del directorio; el listado puede ser parcial." : ""}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1020px] text-left text-sm">
            <thead className="bg-muted/40"><tr>
              {["Correo", "Rol", "Perfil", "Correo confirmado", "Creación", "Último acceso", "Gestión"].map(h =>
                <th key={h} className="px-4 py-3 font-medium">{h}</th>)}
            </tr></thead>
            <tbody>
              {list.map(u => <tr key={u.id} className="border-t">
                <td className="px-4 py-4"><span className="font-medium">{u.email ?? "Sin correo"}</span>
                  <div title={u.id} className="mt-1 max-w-64 truncate font-mono text-[11px] text-muted-foreground">{u.id}</div></td>
                <td className="px-4 py-4">{u.role ?? "Sin rol"}</td>
                <td className="px-4 py-4">
                  <span className="rounded-full border px-2.5 py-1 text-xs">
                    {userStatus(u) === "ACTIVE" ? "Activo" : userStatus(u) === "INACTIVE" ? "Inactivo" : "Sin perfil válido"}
                  </span>
                </td>
                <td className="px-4 py-4">{u.email_confirmed ? "Sí" : "No"}</td>
                <td className="px-4 py-4 whitespace-nowrap">{dateTime(u.created_at)}</td>
                <td className="px-4 py-4 whitespace-nowrap">{dateTime(u.last_sign_in_at)}</td>
                <td className="px-4 py-4">
                  {u.id === actorId ? <span className="text-xs text-muted-foreground">Cuenta propia protegida</span>
                    : !u.role || u.is_active === null ? <span className="text-xs text-muted-foreground">Sin perfil; requiere vinculación autorizada</span>
                    : <ActionForm small title="Modificar acceso de usuario" trigger="Gestionar acceso"
                        description={`Cuenta: ${u.email ?? u.id}. El cambio afectará las próximas verificaciones de permisos.`}
                        action={setUserAccess} hidden={{id:u.id}} submitLabel="Guardar acceso"
                        fields={[
                          {name:"role",label:"Rol",type:"select",required:true,initial:u.role,options:[{value:"ADMIN",label:"ADMIN"},{value:"SECURITY",label:"SECURITY"}]},
                          {name:"active",label:"Estado",type:"select",required:true,initial:String(u.is_active),options:[{value:"true",label:"Activo"},{value:"false",label:"Inactivo"}]},
                          {name:"reason",label:"Justificación para auditoría (10–500 caracteres)",type:"textarea",required:true,minLength:10,maxLength:500,placeholder:"Motivo de la modificación de acceso"},
                          {name:"confirm",label:"Confirmo que revisé el rol y el estado de esta cuenta",type:"checkbox",required:true},
                        ]}
                        warning="Solo ADMIN puede realizar esta operación. No se pueden modificar cuentas propias ni desactivar al último ADMIN. La justificación queda registrada en auditoría." />}
                </td>
              </tr>)}
            </tbody>
          </table>
          {list.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No hay cuentas que coincidan con el filtro.</p>}
        </div>
      </section>
      <p className="text-sm text-muted-foreground">
        Gestión auditada e invitaciones del mismo Supabase. Los empleados receptores de equipos nunca necesitan cuenta.
      </p>
    </>}
  </main>;
}
