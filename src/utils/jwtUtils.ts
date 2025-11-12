/**
 * Utility functions for working with JWT tokens
 */

/**
 * Extracts the first surname from the user's full name in the JWT token
 * @returns The first surname or a default value if extraction fails
 */
export const extractUserSurnameFromToken = (): string => {
  try {
    // Obtener el token del localStorage
    const authToken = localStorage.getItem('authToken');
    if (!authToken) return 'SUPERVISOR';
    
    // Decodificar el token (solo la parte del payload)
    const tokenParts = authToken.split('.');
    if (tokenParts.length !== 3) return 'SUPERVISOR';
    
    // Decodificar la parte del payload (segunda parte)
    const payload = JSON.parse(atob(tokenParts[1]));
    
    // Extraer el nombre completo
    const nombreCompleto = payload.nombreCompleto;
    if (!nombreCompleto) return 'SUPERVISOR';
    
    // Obtener el primer apellido (primera palabra)
    const primerApellido = nombreCompleto.split(' ')[0];
    return primerApellido || 'SUPERVISOR';
  } catch (error) {
    console.error('Error al extraer el primer apellido del token:', error);
    return 'SUPERVISOR';
  }
};

/**
 * Extracts the document number (DNI) from the JWT token
 * @returns The document number from the 'sub' field or an empty string if extraction fails
 */
export const extractDocumentFromToken = (): string => {
  try {
    // Obtener el token del localStorage
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      console.warn('No se encontró authToken en localStorage');
      return '';
    }
    
    // Decodificar el token (solo la parte del payload)
    const tokenParts = authToken.split('.');
    if (tokenParts.length !== 3) {
      console.warn('Token JWT no tiene el formato correcto');
      return '';
    }
    
    // Decodificar la parte del payload (segunda parte)
    const payload = JSON.parse(atob(tokenParts[1]));
    
    // Extraer el campo 'sub' que contiene el documento
    const documento = payload.sub;
    if (!documento) {
      console.warn('No se encontró el campo "sub" en el token');
      return '';
    }
    
    return documento;
  } catch (error) {
    console.error('Error al extraer el documento del token:', error);
    return '';
  }
};

/**
 * Extracts the full name (nombreCompleto) from the JWT token
 * @returns The full name or an empty string if extraction fails
 */
export const extractNombreCompletoFromToken = (): string => {
  try {
    // Obtener el token del localStorage
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      console.warn('No se encontró authToken en localStorage');
      return '';
    }
    
    // Decodificar el token (solo la parte del payload)
    const tokenParts = authToken.split('.');
    if (tokenParts.length !== 3) {
      console.warn('Token JWT no tiene el formato correcto');
      return '';
    }
    
    // Decodificar la parte del payload (segunda parte)
    const payload = JSON.parse(atob(tokenParts[1]));
    
    // Extraer el campo 'nombreCompleto'
    const nombreCompleto = payload.nombreCompleto;
    if (!nombreCompleto) {
      console.warn('No se encontró el campo "nombreCompleto" en el token');
      return '';
    }
    
    return nombreCompleto;
  } catch (error) {
    console.error('Error al extraer el nombre completo del token:', error);
    return '';
  }
};

/**
 * Extracts the job position (puesto) from the JWT token
 * @returns The job position or null if extraction fails
 */
export const extractPuestoFromToken = (): string | null => {
  try {
    // Obtener el token del localStorage
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      console.warn('No se encontró authToken en localStorage');
      return null;
    }
    
    // Decodificar el token (solo la parte del payload)
    const tokenParts = authToken.split('.');
    if (tokenParts.length !== 3) {
      console.warn('Token JWT no tiene el formato correcto');
      return null;
    }
    
    // Decodificar la parte del payload (segunda parte)
    const payload = JSON.parse(atob(tokenParts[1]));
    
    // Extraer el campo 'puesto'
    const puesto = payload.puesto;
    if (!puesto) {
      console.warn('No se encontró el campo "puesto" en el token');
      return null;
    }
    
    return puesto;
  } catch (error) {
    console.error('Error al extraer el puesto del token:', error);
    return null;
  }
};

/**
 * Verifica si el usuario tiene acceso al módulo de CITAS
 * Puestos autorizados: CALL CENTER, DEVOPS
 */
export const hasAccessToCitas = (): boolean => {
  const puesto = extractPuestoFromToken();
  if (!puesto) return false;
  
  const puestosAutorizados = ['CALL CENTER', 'DEVOPS' , 'ANALISTA', 'DESARROLLADOR', 'ADMISIONISTA'];
  return puestosAutorizados.includes(puesto.toUpperCase());
};

/**
 * Verifica si el usuario tiene acceso al módulo de TABLAS MAESTRAS
 * Puestos autorizados: DEVOPS, ESTADISTICA
 */
export const hasAccessToTablasMaestras = (): boolean => {
  const puesto = extractPuestoFromToken();
  if (!puesto) return false;
  
  const puestosAutorizados = ['DEVOPS' , 'ANALISTA', 'DESARROLLADOR', 'ESTADISTICA'];
  return puestosAutorizados.includes(puesto.toUpperCase());
};

/**
 * Verifica si el usuario tiene acceso al módulo de HOSPITALIZACIÓN/EMERGENCIA
 * Por defecto todos tienen acceso a este módulo
 */
export const hasAccessToHospitalizacion = (): boolean => {
  return true; // Acceso para todos
};
