<?php
declare(strict_types=1);
/**
* De momento solo comprobamos que el endpoint responde y que el navegador
* puede hacer fetch() a este archivo. En la siguiente parte implementamos
* list | create | delete con persistencia en data.json.
*/
header('Content-Type: application/json; charset=utf-8');
/**
* Envía una respuesta de éxito con envoltura homogénea.
*
* @param mixed $contenidoDatos Datos a devolver (ej: lista de usuarios).

* @param int $codigoHttp Código de estado HTTP (200 por defecto).
*/
function responder_json_exito(mixed $contenidoDatos = [], int $codigoHttp = 200): void {
http_response_code($codigoHttp);
echo json_encode(
['ok' => true, 'data' => $contenidoDatos],
JSON_UNESCAPED_UNICODE
);
exit;
}
/**
* Envía una respuesta de error con envoltura homogénea.
*
* @param string $mensajeError Mensaje de error legible para el cliente.
* @param int $codigoHttp Código de estado HTTP (400 por defecto).
*/
function responder_json_error(string $mensajeError, int $codigoHttp = 400): void {
http_response_code($codigoHttp);
echo json_encode(
['ok' => false, 'error' => $mensajeError],
JSON_UNESCAPED_UNICODE
);
exit;
}

// 2) Ruta al archivo de persistencia (misma carpeta)
$rutaArchivoDatosJson = __DIR__ . '/data.json';
// 2.1) Si no existe, lo creamos con un array JSON vacío ([])
if (!file_exists($rutaArchivoDatosJson)) {
file_put_contents($rutaArchivoDatosJson, json_encode([]) . "\n");
}
// 2.2) Cargar su contenido como array asociativo de PHP
$listaUsuarios = json_decode((string) file_get_contents($rutaArchivoDatosJson), true);
// 2.3) Si por cualquier motivo no es un array, lo normalizamos a []
if (!is_array($listaUsuarios)) {
$listaUsuarios = [];
}

// 3) Método HTTP y acción (por querystring o formulario)
// - Por simplicidad: list en GET; create y delete por POST.
// - Si no llega 'action', usamos 'list' como valor por defecto.
$metodoHttpRecibido = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$accionSolicitada = $_GET['action'] ?? $_POST['action'] ?? 'list';

// 4) LISTAR usuarios: GET /api.php?action=list
if ($metodoHttpRecibido === 'GET' && $accionSolicitada === 'list') {
responder_json_exito($listaUsuarios); // 200 OK
}

// 5) CREAR usuario: POST /api.php?action=create
// Body JSON esperado: { "nombre": "...", "email": "..." }
if ($metodoHttpRecibido === 'POST' && $accionSolicitada === 'create') {
// 5.1) Leer el cuerpo bruto para soportar JSON
$cuerpoBruto = (string) file_get_contents('php://input');
$datosDecodificados = $cuerpoBruto !== '' ? (json_decode($cuerpoBruto, true) ?? []) : [];
// 5.2) Extraer con prioridad: JSON → POST clásico → cadena vacía
$nombreUsuarioNuevo = trim((string) ($datosDecodificados['nombre'] ?? $_POST['nombre'] ?? ''));
$correoUsuarioNuevo = trim((string) ($datosDecodificados['email'] ?? $_POST['email'] ?? ''));
// 5.3) Validación mínima en servidor
if ($nombreUsuarioNuevo === '' || $correoUsuarioNuevo === '') {
responder_json_error('Los campos "nombre" y "email" son obligatorios.', 422);
}
if (!filter_var($correoUsuarioNuevo, FILTER_VALIDATE_EMAIL)) {
responder_json_error('El campo "email" no tiene un formato válido.', 422);
}
// 5.4) Agregar al array en memoria
$listaUsuarios[] = [
'nombre' => $nombreUsuarioNuevo,
'email' => $correoUsuarioNuevo,
];

// 5.5) Persistir en disco con formato legible
file_put_contents(
$rutaArchivoDatosJson,
json_encode($listaUsuarios, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n"
);
// 5.6) Devolver lista completa con 201 (creado)
responder_json_exito($listaUsuarios, 201);
}

// 6) ELIMINAR usuario: POST /api.php?action=delete
// Body JSON esperado: { "index": 0 }
// Nota: podríamos usar método DELETE; aquí lo simplificamos a POST.
if (($metodoHttpRecibido === 'POST' || $metodoHttpRecibido === 'DELETE') && $accionSolicitada ===
'delete') {
// 6.1) Intentamos obtener el índice por distintos canales
$indiceEnQuery = $_GET['index'] ?? null;
if ($indiceEnQuery === null) {
$cuerpoBruto = (string) file_get_contents('php://input');
if ($cuerpoBruto !== '') {
$datosDecodificados = json_decode($cuerpoBruto, true) ?? [];
$indiceEnQuery = $datosDecodificados['index'] ?? null;
} else {
$indiceEnQuery = $_POST['index'] ?? null;
}
}
// 6.2) Validaciones de existencia del parámetro
if ($indiceEnQuery === null) {
responder_json_error('Falta el parámetro "index" para eliminar.', 422);
}
$indiceUsuarioAEliminar = (int) $indiceEnQuery;
if (!isset($listaUsuarios[$indiceUsuarioAEliminar])) {
responder_json_error('El índice indicado no existe.', 404);
}
// 6.3) Eliminamos y reindexamos para mantener la continuidad
unset($listaUsuarios[$indiceUsuarioAEliminar]);
$listaUsuarios = array_values($listaUsuarios);
// 6.4) Guardamos el nuevo estado en disco
file_put_contents(
$rutaArchivoDatosJson,
json_encode($listaUsuarios, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n"
);
// 6.5) Devolvemos el listado actualizado
responder_json_exito($listaUsuarios); // 200 OK
}
// 7) Si llegamos aquí, la acción solicitada no está soportada
responder_json_error('Acción no soportada. Use list | create | delete', 400);
?>