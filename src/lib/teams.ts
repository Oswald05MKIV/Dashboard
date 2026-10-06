/**
 * Teams calculados desde dashboard.json (ya no hay números escritos a mano).
 * Si un asesor se da de baja en scripts/build-data.mjs desaparece solo de su equipo.
 */
import type { DashboardData } from "../types";
import { MESES_LARGOS } from "../config";

export type ColorTeam = "red" | "blue" | "white" | "green" | "purple" | "orange";

export type TotalTeam = {
  recorridos: number;
  mostradas: number;
  opcionadas: number;
  leads: number;
  rentas: number;
  ventas: number;
};

export type IntegranteTeam = TotalTeam & { nombre: string; canonico?: string; sinDatos?: boolean };

export type Team = {
  nombre: string;
  color: ColorTeam;
  integrantes: IntegranteTeam[];
  total: TotalTeam;
};

export type PeriodoTeams = { clave: string; etiqueta: string; desde: number; hasta: number };

const CLAVES: (keyof TotalTeam)[] = ["recorridos", "mostradas", "opcionadas", "leads", "rentas", "ventas"];

/** Acumulado desde el arranque de equipos + cada mes por separado. */
export function periodosTeams(data: DashboardData): PeriodoTeams[] {
  const ini = data.teams.inicioMes;
  const fin = data.currentMonth;
  const lista: PeriodoTeams[] = [];
  if (fin > ini) {
    lista.push({
      clave: "acum",
      etiqueta: `Acumulado ${MESES_LARGOS[ini - 1].slice(0, 3).toLowerCase()}–${MESES_LARGOS[fin - 1].slice(0, 3).toLowerCase()}`,
      desde: ini,
      hasta: fin,
    });
  }
  for (let m = fin; m >= ini; m--) {
    lista.push({ clave: `m${m}`, etiqueta: MESES_LARGOS[m - 1] + (m === fin ? " (en curso)" : ""), desde: m, hasta: m });
  }
  return lista;
}

export function teamsDelPeriodo(data: DashboardData, desde: number, hasta: number): Team[] {
  const suma = (serie: number[]) => serie.slice(desde - 1, hasta).reduce((a, b) => a + (b || 0), 0);
  return data.teams.equipos.map((eq) => {
    const integrantes: IntegranteTeam[] = eq.integrantes.map((i) => {
      const fila = { nombre: i.nombre, canonico: i.canonico, sinDatos: i.sinDatos } as IntegranteTeam;
      for (const k of CLAVES) fila[k] = suma(i.meses[k]);
      return fila;
    });
    const total = Object.fromEntries(CLAVES.map((k) => [k, integrantes.reduce((a, x) => a + x[k], 0)])) as TotalTeam;
    return { nombre: eq.nombre, color: eq.color, integrantes, total };
  });
}
