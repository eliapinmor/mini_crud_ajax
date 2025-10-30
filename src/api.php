<?php
declare(strict_types=1);
/**
* De momento solo comprobamos que el endpoint responde y que el navegador
* puede hacer fetch() a este archivo. En la siguiente parte implementamos
* list | create | delete con persistencia en data.json.
*/
header('Content-Type: application/json; charset=utf-8');
echo json_encode(['ok' => true, 'message' => 'API en construcción']);
?>