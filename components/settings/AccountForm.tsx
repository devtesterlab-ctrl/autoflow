"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { changePassword, updateProfile } from "@/app/dashboard/settings/actions";

const INPUT_CLASS =
  "h-14 w-full border-2 border-black bg-transparent px-4 text-base outline-none focus:ring-4 focus:ring-black/20 dark:border-white dark:focus:ring-white/30";

type Message = { type: "ok" | "error"; text: string } | null;

function Notice({ message }: { message: Message }) {
  if (!message) return null;
  return (
    <p
      role={message.type === "error" ? "alert" : "status"}
      className={`text-sm font-bold ${message.type === "error" ? "text-red-600" : "text-emerald-700 dark:text-emerald-400"}`}
    >
      {message.text}
    </p>
  );
}

export function AccountForm({ name: initialName, email }: { name: string; email: string }) {
  const [name, setName] = useState(initialName);
  const [profileMessage, setProfileMessage] = useState<Message>(null);
  const [profilePending, startProfile] = useTransition();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<Message>(null);
  const [passwordPending, startPassword] = useTransition();

  function saveProfile() {
    setProfileMessage(null);
    startProfile(async () => {
      const result = await updateProfile({ name });
      setProfileMessage(
        result.ok
          ? { type: "ok", text: "Nombre actualizado." }
          : { type: "error", text: result.fieldErrors?.name ?? result.error },
      );
    });
  }

  function savePassword() {
    setPasswordMessage(null);
    if (newPassword !== confirm) {
      setPasswordMessage({ type: "error", text: "Las contraseñas nuevas no coinciden." });
      return;
    }
    startPassword(async () => {
      const result = await changePassword({ currentPassword, newPassword });
      // Si salió bien, el servidor cierra la sesión y redirige al login: acá solo llegan los errores.
      if (!result.ok) {
        setPasswordMessage({ type: "error", text: result.fieldErrors?.newPassword ?? result.error });
      }
    });
  }

  return (
    <div className="space-y-6">
      <section className="space-y-4 border-2 border-black p-4 dark:border-white" aria-labelledby="profile-title">
        <h2 id="profile-title" className="text-xl font-extrabold">
          Mi cuenta
        </h2>
        <label className="block space-y-1">
          <span className="text-sm font-semibold">Nombre</span>
          <input value={name} onChange={(event) => setName(event.target.value)} className={INPUT_CLASS} autoComplete="name" />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-semibold">Email</span>
          <input value={email} readOnly className={`${INPUT_CLASS} opacity-60`} />
        </label>
        <Notice message={profileMessage} />
        <button
          type="button"
          onClick={saveProfile}
          disabled={profilePending}
          className="flex h-12 items-center gap-2 border-2 border-black bg-black px-6 font-bold text-white disabled:opacity-50 dark:border-white dark:bg-white dark:text-black"
        >
          {profilePending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Guardar nombre
        </button>
      </section>

      <section className="space-y-4 border-2 border-black p-4 dark:border-white" aria-labelledby="password-title">
        <h2 id="password-title" className="text-xl font-extrabold">
          Cambiar contraseña
        </h2>
        <label className="block space-y-1">
          <span className="text-sm font-semibold">Contraseña actual</span>
          <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" className={INPUT_CLASS} />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-semibold">Nueva contraseña</span>
          <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" className={INPUT_CLASS} />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-semibold">Repetir nueva contraseña</span>
          <input type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} autoComplete="new-password" className={INPUT_CLASS} />
        </label>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">Al cambiarla se cierran todas tus sesiones y tenés que ingresar de nuevo.</p>
        <Notice message={passwordMessage} />
        <button
          type="button"
          onClick={savePassword}
          disabled={passwordPending || !currentPassword || !newPassword}
          className="flex h-12 items-center gap-2 border-2 border-black px-6 font-bold disabled:opacity-50 dark:border-white"
        >
          {passwordPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Cambiar contraseña
        </button>
      </section>
    </div>
  );
}
