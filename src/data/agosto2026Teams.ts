export type ColorTeam = 'red' | 'blue' | 'white' | 'green' | 'purple' | 'orange';

export type TotalTeam = {
  recorridos: number;
  mostradas: number;
  opcionadas: number;
  leads: number;
  rentas: number;
  ventas: number;
};

export type IntegranteTeam = TotalTeam & { nombre: string; sinDatos?: boolean };

// `nombre` es el nombre que se muestra (civilización); `color` es la clave interna
// estable del equipo y es lo que usan los estandartes, soldados y el mapa.
export type Team = {
  nombre: string;
  color: ColorTeam;
  integrantes: IntegranteTeam[];
  total: TotalTeam;
};

export const agosto2026Teams: { periodo: string; teams: Team[]; teamsNota: string } = {
  periodo: 'Agosto 2026',
  teamsNota:
    'Agosto 2026 es el primer mes con medicion por equipo. Los integrantes dados de alta este mes todavia no tienen captura en los archivos fuente y aparecen marcados como sin datos.',
  teams: [
    {
      nombre: 'Chinos',
      color: 'red',
      integrantes: [
        { nombre: 'Erik Trotter', recorridos: 2, mostradas: 6, opcionadas: 4, leads: 0, rentas: 0, ventas: 0 },
        { nombre: 'Martha Ochoa', recorridos: 1, mostradas: 1, opcionadas: 1, leads: 0, rentas: 0, ventas: 0 },
        { nombre: 'Daniela Morales', recorridos: 0, mostradas: 0, opcionadas: 0, leads: 0, rentas: 0, ventas: 0, sinDatos: true },
        { nombre: 'Erick Rosales', recorridos: 0, mostradas: 0, opcionadas: 0, leads: 0, rentas: 0, ventas: 0, sinDatos: true },
      ],
      total: { recorridos: 3, mostradas: 7, opcionadas: 5, leads: 0, rentas: 0, ventas: 0 },
    },
    {
      nombre: 'Aztecas',
      color: 'blue',
      integrantes: [
        { nombre: 'Pily González', recorridos: 0, mostradas: 0, opcionadas: 0, leads: 0, rentas: 0, ventas: 1980000 },
        { nombre: 'Luis Alcántar', recorridos: 0, mostradas: 0, opcionadas: 0, leads: 0, rentas: 0, ventas: 0 },
        { nombre: 'Adri Regalado', recorridos: 5, mostradas: 5, opcionadas: 0, leads: 0, rentas: 16000, ventas: 0 },
        { nombre: 'Gis García', recorridos: 9, mostradas: 15, opcionadas: 2, leads: 0, rentas: 28800, ventas: 0 },
        { nombre: 'Noe', recorridos: 0, mostradas: 0, opcionadas: 0, leads: 0, rentas: 0, ventas: 0, sinDatos: true },
      ],
      total: { recorridos: 14, mostradas: 20, opcionadas: 2, leads: 0, rentas: 44800, ventas: 1980000 },
    },
    {
      nombre: 'Persas',
      color: 'white',
      integrantes: [
        { nombre: 'Sol Huerta', recorridos: 2, mostradas: 5, opcionadas: 9, leads: 0, rentas: 0, ventas: 0 },
        { nombre: 'Adri Calva', recorridos: 5, mostradas: 8, opcionadas: 1, leads: 0, rentas: 0, ventas: 0 },
        { nombre: 'Héctor de la Peña', recorridos: 9, mostradas: 12, opcionadas: 1, leads: 0, rentas: 0, ventas: 0 },
        { nombre: 'Elena Romano', recorridos: 5, mostradas: 5, opcionadas: 0, leads: 0, rentas: 23000, ventas: 0 },
        { nombre: 'Angel', recorridos: 0, mostradas: 0, opcionadas: 0, leads: 0, rentas: 0, ventas: 0, sinDatos: true },
      ],
      total: { recorridos: 21, mostradas: 30, opcionadas: 11, leads: 0, rentas: 23000, ventas: 0 },
    },
    {
      nombre: 'Griegos',
      color: 'green',
      integrantes: [
        { nombre: 'Mariana Vega', recorridos: 11, mostradas: 20, opcionadas: 3, leads: 0, rentas: 13000, ventas: 0 },
        { nombre: 'Chris Alvarado', recorridos: 2, mostradas: 7, opcionadas: 1, leads: 0, rentas: 12000, ventas: 0 },
        { nombre: 'Liz Pérez', recorridos: 0, mostradas: 0, opcionadas: 2, leads: 0, rentas: 23000, ventas: 0 },
        { nombre: 'Lesley', recorridos: 0, mostradas: 0, opcionadas: 0, leads: 0, rentas: 0, ventas: 0, sinDatos: true },
      ],
      total: { recorridos: 13, mostradas: 27, opcionadas: 6, leads: 0, rentas: 48000, ventas: 0 },
    },
    {
      nombre: 'Troyanos',
      color: 'purple',
      integrantes: [
        { nombre: 'Judith Diosdado', recorridos: 2, mostradas: 3, opcionadas: 0, leads: 0, rentas: 8000, ventas: 0 },
        { nombre: 'Susana Ávila', recorridos: 0, mostradas: 0, opcionadas: 1, leads: 0, rentas: 0, ventas: 0 },
        { nombre: 'Angie Bostal', recorridos: 0, mostradas: 0, opcionadas: 4, leads: 0, rentas: 26170, ventas: 0 },
        { nombre: 'Olivia', recorridos: 0, mostradas: 0, opcionadas: 0, leads: 0, rentas: 0, ventas: 0, sinDatos: true },
      ],
      total: { recorridos: 2, mostradas: 3, opcionadas: 5, leads: 0, rentas: 34170, ventas: 0 },
    },
    {
      nombre: 'Romanos',
      color: 'orange',
      integrantes: [
        { nombre: 'Lore Ramos', recorridos: 15, mostradas: 20, opcionadas: 3, leads: 0, rentas: 50700, ventas: 1200000 },
        { nombre: 'Chris Díaz', recorridos: 7, mostradas: 13, opcionadas: 3, leads: 0, rentas: 0, ventas: 0 },
        { nombre: 'Alberto Flores', recorridos: 0, mostradas: 0, opcionadas: 0, leads: 0, rentas: 0, ventas: 0 },
        { nombre: 'Julieta', recorridos: 0, mostradas: 0, opcionadas: 0, leads: 0, rentas: 0, ventas: 0, sinDatos: true },
        { nombre: 'Rocío Ávalos', recorridos: 0, mostradas: 0, opcionadas: 0, leads: 0, rentas: 0, ventas: 0, sinDatos: true },
      ],
      total: { recorridos: 22, mostradas: 33, opcionadas: 6, leads: 0, rentas: 50700, ventas: 1200000 },
    },
  ],
};

export default agosto2026Teams;
