export const CHECKLISTS = {
    Departure: [
        'Verificar estado físico del control',
        'Verificar estado físico de la aeronave',
        'Verificar hélices',
        'Verificar motores',
        'Verificar baterías cargadas',
        'Verificar tablet/celular cargado',
        'Verificar cables de conexión',
        'Verificar zona de despegue segura',
    ],
    Assembly: [
        'Desplegar brazos de la aeronave',
        'Asegurar mecanismos de bloqueo',
        'Instalar hélices correctamente',
        'Instalar batería (sin conectar)',
        'Instalar cámara/payload',
        'Retirar protectores de cámara',
    ],
    PreFlight: [
        'Encender control remoto',
        'Encender aeronave',
        'Verificar conexión RC-Aeronave',
        'Verificar señal GPS',
        'Calibrar brújula si es necesario',
        'Verificar telemetría en app',
    ],
    PostFlight: [
        'Apagar aeronave',
        'Apagar control remoto',
        'Inspeccionar motores por sobrecalentamiento',
        'Inspeccionar hélices',
        'Inspeccionar batería (hinchazón/daño)',
        'Retirar batería y guardar',
        'Reporte de vuelo correctamente guardado en Bitácora', // Auto-checked logic handled in screen
    ],
};
