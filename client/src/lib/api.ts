const API_BASE_URL =
  import.meta.env.VITE_API_URL ??
  "http://localhost:5000/api";

/*
|--------------------------------------------------------------------------
| AUTH TOKEN
|--------------------------------------------------------------------------
|
| Must match the key used in AuthContext.tsx.
|
*/

const AUTH_TOKEN_KEY =
  "kitedesk_auth_token";

/*
|--------------------------------------------------------------------------
| SAFE TOKEN READER
|--------------------------------------------------------------------------
|
| Some browsers may restrict storage.
| If that happens, we simply fall back
| to cookie authentication.
|
*/

function getAuthToken():
  string | null {
  try {
    return window.localStorage.getItem(
      AUTH_TOKEN_KEY
    );
  } catch (error) {
    console.warn(
      "Unable to read authentication token:",
      error
    );

    return null;
  }
}

/*
|--------------------------------------------------------------------------
| API ERROR TYPES
|--------------------------------------------------------------------------
*/

export type ApiErrorResponse = {
  success?: false;

  message?: string;

  code?: string;

  details?: unknown;

  errors?: Array<{
    field: string;

    message: string;
  }>;
};

export class ApiError extends Error {
  status: number;

  code?: string;

  details?: unknown;

  errors?: Array<{
    field: string;

    message: string;
  }>;

  constructor(
    message: string,
    status: number,
    data?: ApiErrorResponse
  ) {
    super(message);

    this.name =
      "ApiError";

    this.status =
      status;

    this.code =
      data?.code;

    this.details =
      data?.details;

    this.errors =
      data?.errors;
  }
}

/*
|--------------------------------------------------------------------------
| FETCH OPTIONS
|--------------------------------------------------------------------------
*/

type ApiFetchOptions = Omit<
  RequestInit,
  "body"
> & {
  body?: unknown;
};

/*
|--------------------------------------------------------------------------
| API FETCH
|--------------------------------------------------------------------------
*/

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const {
    body,
    headers,
    ...restOptions
  } = options;

  /*
   * Convert RequestInit headers into
   * a real Headers instance.
   *
   * This works with:
   *
   * Headers
   * objects
   * arrays
   */
  const requestHeaders =
    new Headers(
      headers
    );

  /*
   * JSON body
   */
  if (
    body !== undefined &&
    !requestHeaders.has(
      "Content-Type"
    )
  ) {
    requestHeaders.set(
      "Content-Type",
      "application/json"
    );
  }

  /*
   * Bearer authentication.
   *
   * This is the important fix for
   * browsers that refuse the
   * cross-site HTTP-only cookie.
   */
  const token =
    getAuthToken();

  if (
    token &&
    !requestHeaders.has(
      "Authorization"
    )
  ) {
    requestHeaders.set(
      "Authorization",
      `Bearer ${token}`
    );
  }

  /*
   * Send request.
   *
   * credentials: "include" remains
   * enabled so browsers that support
   * the HTTP-only cookie can continue
   * using it too.
   */
  const response =
    await fetch(
      `${API_BASE_URL}${path}`,
      {
        ...restOptions,

        credentials:
          "include",

        headers:
          requestHeaders,

        ...(body !== undefined
          ? {
              body:
                JSON.stringify(
                  body
                ),
            }
          : {}),
      }
    );

  /*
   * Parse JSON response when
   * available.
   */
  const contentType =
    response.headers.get(
      "content-type"
    );

  const data =
    contentType?.includes(
      "application/json"
    )
      ? await response.json()
      : null;

  /*
   * Convert failed responses into
   * our standard ApiError.
   */
  if (
    !response.ok
  ) {
    const errorData =
      data as
        | ApiErrorResponse
        | null;

    throw new ApiError(
      errorData?.message ??
        `Request failed with status ${response.status}.`,

      response.status,

      errorData ??
        undefined
    );
  }

  return data as T;
}

/*
|--------------------------------------------------------------------------
| EXPORTS
|--------------------------------------------------------------------------
*/

export {
  API_BASE_URL,
};