// Control principal del formulario de contacto.
// Se encarga de:
// 1. Validar campos antes del envio.
// 2. Mostrar mensajes de error por campo.
// 3. Enviar los datos a Web3Forms mediante fetch.
// 4. Informar al usuario el estado del envio.

const form = document.querySelector("#contact-form");

if (form) {
  const status = document.querySelector("#form-status");
  const submitButton = form.querySelector('button[type="submit"]');
  const formEndpoint = form.getAttribute("action");
  const accessKeyField = form.querySelector('input[name="access_key"]');
  const submitButtonDefaultText = submitButton?.textContent || "Enviar consulta";
  const statusMessages = {
    invalidForm: "Corrige los campos marcados antes de enviar.",
    sending: "Enviando consulta...",
    success: "Consulta enviada satisfactoriamente.",
    missingEndpoint: "El formulario no tiene un endpoint configurado.",
    missingAccessKey: "Debes reemplazar YOUR_ACCESS_KEY_HERE por tu Access Key real de Web3Forms.",
    sendError: "No fue posible enviar la consulta.",
  };

  // Solo validamos campos visibles/editables del usuario.
  const fields = Array.from(
    form.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]), select, textarea')
  );

  // Reglas de validacion por campo.
  const validators = {
    name(value) {
      if (!value.trim()) return "Ingresa tu nombre.";
      if (value.trim().length < 2) return "El nombre debe tener al menos 2 caracteres.";
      return "";
    },
    email(value) {
      if (!value.trim()) return "Ingresa tu correo electronico.";
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(value.trim())) return "Ingresa un correo valido.";
      return "";
    },
    phone(value) {
      if (!value.trim()) return "";
      const phonePattern = /^[0-9+\s()-]{8,20}$/;
      if (!phonePattern.test(value.trim())) return "Ingresa un telefono valido.";
      return "";
    },
    motivo(value) {
      if (!value.trim()) return "Selecciona un motivo.";
      return "";
    },
    message(value) {
      if (!value.trim()) return "Escribe tu mensaje.";
      if (value.trim().length < 10) return "El mensaje debe tener al menos 10 caracteres.";
      return "";
    },
  };

  // Busca el contenedor de error asociado al nombre del campo.
  function getErrorElement(name) {
    return form.querySelector(`[data-error-for="${name}"]`);
  }

  // Pinta o limpia el error visual del campo.
  function setFieldError(field, message) {
    const errorElement = getErrorElement(field.name);
    field.classList.toggle("input-invalid", Boolean(message));

    if (errorElement) {
      errorElement.textContent = message;
    }
  }

  // Ejecuta la validacion de un campo puntual.
  function validateField(field) {
    const validator = validators[field.name];
    if (!validator) return "";

    const normalizedValue = field.value.trim();
    const message = validator(normalizedValue);

    setFieldError(field, message);
    return message;
  }

  // Genera el payload final eliminando espacios sobrantes en los textos.
  function buildPayload() {
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    Object.keys(payload).forEach((key) => {
      if (typeof payload[key] === "string") {
        payload[key] = payload[key].trim();
      }
    });

    return payload;
  }

  // Ejecuta la validacion completa del formulario.
  function validateForm() {
    let hasErrors = false;

    fields.forEach((field) => {
      const message = validateField(field);
      if (message) {
        hasErrors = true;
      }
    });

    return !hasErrors;
  }

  // Actualiza el texto informativo inferior del formulario.
  function updateStatus(message, type = "") {
    if (!status) return;

    status.textContent = message;
    status.classList.remove("is-error", "is-success");

    if (type) {
      status.classList.add(type);
    }
  }

  // Web3Forms usa una access key publica en un campo hidden.
  // Esta funcion confirma que realmente fue configurada.
  function getAccessKey() {
    const value = accessKeyField?.value?.trim() || "";

    if (!value || value === "YOUR_ACCESS_KEY_HERE") {
      throw new Error(statusMessages.missingAccessKey);
    }

    return value;
  }

  // Envia el formulario al endpoint oficial de Web3Forms.
  // La documentacion oficial indica POST a https://api.web3forms.com/submit
  // con access_key y los demas campos del formulario.
  async function submitForm() {
    if (!formEndpoint) {
      throw new Error(statusMessages.missingEndpoint);
    }

    getAccessKey();
    const payload = buildPayload();

    const response = await fetch(formEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || statusMessages.sendError);
    }

    return result;
  }

  // Valida en tiempo real mientras el usuario escribe o cambia un campo.
  fields.forEach((field) => {
    const eventName = field.tagName === "SELECT" ? "change" : "input";

    field.addEventListener(eventName, () => {
      validateField(field);

      if (status?.classList.contains("is-error")) {
        updateStatus("");
      }
    });
  });

  // Controla el envio final.
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      updateStatus(statusMessages.invalidForm, "is-error");
      return;
    }

    try {
      submitButton.disabled = true;
      submitButton.textContent = "Enviando...";
      updateStatus(statusMessages.sending);

      await submitForm();

      form.reset();
      fields.forEach((field) => setFieldError(field, ""));
      updateStatus(statusMessages.success, "is-success");
    } catch (error) {
      updateStatus(error.message, "is-error");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = submitButtonDefaultText;
    }
  });
}
