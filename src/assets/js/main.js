/** URL absoluta o relativa del endpoint PHP (API del servidor) */
const URL_API_SERVIDOR = "/api.php";
/** Elementos de la interfaz que necesitamos manipular */
const nodoCuerpoTablaUsuarios = document.getElementById("tbody"); // <tbody> del listado
const formularioAltaUsuario = document.getElementById("formCreate"); // <form> de alta
const nodoZonaMensajesEstado = document.getElementById("msg");

// -----------------------------------------------------------------------------
// BLOQUE: Gestión de mensajes de estado (éxito / error)
// Muestra un texto temporal en la página y lo limpia a los 2s.
// 'tipoEstado' debe ser 'ok', 'error' o '' (vacío para limpiar).
// -----------------------------------------------------------------------------
function mostrarMensajeDeEstado(tipoEstado, textoMensaje) {
  nodoZonaMensajesEstado.className = tipoEstado; // Aplica clases CSS: .ok o .error
  nodoZonaMensajesEstado.textContent = textoMensaje;
  if (tipoEstado !== "") {
    setTimeout(() => {
      nodoZonaMensajesEstado.className = "";
      nodoZonaMensajesEstado.textContent = "";
    }, 2000);
  }
}

// -----------------------------------------------------------------------------
// BLOQUE: Sanitización de texto para evitar inyección en el DOM
// Reemplaza caracteres especiales por entidades HTML seguras.
// -----------------------------------------------------------------------------
function convertirATextoSeguro(entradaPosiblementePeligrosa) {
  return String(entradaPosiblementePeligrosa)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// -----------------------------------------------------------------------------
// BLOQUE: Renderizado del listado de usuarios
// Recibe un array de objetos {nombre, email} y genera las filas de la tabla.
// -----------------------------------------------------------------------------
function renderizarTablaDeUsuarios(arrayUsuarios) {
  // 4.1) Limpiamos el contenido previo del <tbody>
  nodoCuerpoTablaUsuarios.innerHTML = "";
  // 4.2) Por cada usuario, creamos una fila <tr> y la insertamos
  arrayUsuarios.forEach((usuario, posicionEnLista) => {
    const nodoFila = document.createElement("tr");
    nodoFila.innerHTML = `
<td>${posicionEnLista + 1}</td>
<td>${convertirATextoSeguro(usuario?.nombre ?? "")}</td>
<td>${convertirATextoSeguro(usuario?.email ?? "")}</td>
<td>
<button
type="button"
data-posicion="${posicionEnLista}"
aria-label="Eliminar usuario ${posicionEnLista + 1}">
Eliminar
</button>
</td>
`;
    nodoCuerpoTablaUsuarios.appendChild(nodoFila);
  });
}

// -----------------------------------------------------------------------------
// BLOQUE: Carga inicial y refresco del listado (GET list)
// -----------------------------------------------------------------------------
async function obtenerYMostrarListadoDeUsuarios() {
  try {
    const respuestaHttp = await fetch(`${URL_API_SERVIDOR}?action=list`);
    const cuerpoJson = await respuestaHttp.json();
    if (!cuerpoJson.ok) {
      throw new Error(cuerpoJson.error || "No fue posible obtener el listado.");
    }
    renderizarTablaDeUsuarios(cuerpoJson.data);
  } catch (error) {
    mostrarMensajeDeEstado("error", error.message);
  }
}

// -----------------------------------------------------------------------------
// BLOQUE: Alta de usuario (POST create) sin recargar la página
// -----------------------------------------------------------------------------
formularioAltaUsuario?.addEventListener("submit", async (evento) => {
  // 6.1) Cancelar comportamiento por defecto (evita recargar)
  evento.preventDefault();
  // 6.2) Tomar datos del formulario
  const datosFormulario = new FormData(formularioAltaUsuario);
  const datosUsuarioNuevo = {
    nombre: String(datosFormulario.get("nombre") || "").trim(),
    email: String(datosFormulario.get("email") || "").trim(),
  };
  // 6.3) Validación mínima en cliente (si falla, no llamamos a la API)
  if (!datosUsuarioNuevo.nombre || !datosUsuarioNuevo.email) {
    mostrarMensajeDeEstado(
      "error",
      "Los campos Nombre y Email son obligatorios."
    );
    return;
  }
  try {
    // 6.4) Enviar al servidor como JSON
    const respuestaHttp = await fetch(`${URL_API_SERVIDOR}?action=create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datosUsuarioNuevo),
    });
    const cuerpoJson = await respuestaHttp.json();
    if (!cuerpoJson.ok) {
      throw new Error(cuerpoJson.error || "No fue posible crear el usuario.");
    }

    // 6.5) Pintar el nuevo listado devuelto por el servidor y limpiar el form
    renderizarTablaDeUsuarios(cuerpoJson.data);
    formularioAltaUsuario.reset();
    mostrarMensajeDeEstado("ok", "Usuario agregado correctamente.");
  } catch (error) {
    mostrarMensajeDeEstado("error", error.message);
  }
});

// -----------------------------------------------------------------------------
// BLOQUE: Eliminación de usuario (POST delete) mediante delegación de eventos
// -----------------------------------------------------------------------------
nodoCuerpoTablaUsuarios?.addEventListener("click", async (evento) => {
  // 7.1) ¿Se ha hecho clic en un botón con data-posicion?
  const nodoBotonEliminar = evento.target.closest("button[data-posicion]");
  if (!nodoBotonEliminar) return;
  // 7.2) Convertir el índice a número entero y validar
  const posicionUsuarioAEliminar = parseInt(
    nodoBotonEliminar.dataset.posicion,
    10
  );
  if (!Number.isInteger(posicionUsuarioAEliminar)) return;
  // 7.3) Confirmación de seguridad
  if (!window.confirm("¿Deseas eliminar este usuario?")) return;
  try {
    // 7.4) Enviar petición de borrado al servidor
    const respuestaHttp = await fetch(`${URL_API_SERVIDOR}?action=delete`, {
      method: "POST", // simplificado; podríamos usar DELETE
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ index: posicionUsuarioAEliminar }),
    });
    const cuerpoJson = await respuestaHttp.json();
    if (!cuerpoJson.ok) {
      throw new Error(
        cuerpoJson.error || "No fue posible eliminar el usuario."
      );
    }
    // 7.5) Volver a pintar la lista resultante
    renderizarTablaDeUsuarios(cuerpoJson.data);
    mostrarMensajeDeEstado("ok", "Usuario eliminado correctamente.");
  } catch (error) {
    mostrarMensajeDeEstado("error", error.message);
  }
});

// -----------------------------------------------------------------------------
// BLOQUE: Inicialización de la pantalla
// -----------------------------------------------------------------------------
obtenerYMostrarListadoDeUsuarios();
