const API_BASE_URL =
  import.meta.env.VITE_API_URL ??
  "http://localhost:5000/api";

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

    this.name = "ApiError";
    this.status = status;
    this.code = data?.code;
    this.details = data?.details;
    this.errors = data?.errors;
  }
}

type ApiFetchOptions = Omit<
  RequestInit,
  "body"
> & {
  body?: unknown;
};

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const {
    body,
    headers,
    ...restOptions
  } = options;

  const response =
    await fetch(
      `${API_BASE_URL}${path}`,
      {
        ...restOptions,

        /*
         * VERY IMPORTANT
         *
         * This allows the browser
         * to send/receive our
         * HTTP-only authentication
         * cookie.
         */
        credentials: "include",

        headers: {
          ...(body !== undefined
            ? {
                "Content-Type":
                  "application/json",
              }
            : {}),

          ...headers,
        },

        ...(body !== undefined
          ? {
              body:
                JSON.stringify(body),
            }
          : {}),
      }
    );

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

  if (!response.ok) {
    const errorData =
      data as
        | ApiErrorResponse
        | null;

    throw new ApiError(
      errorData?.message ??
        `Request failed with status ${response.status}.`,
      response.status,
      errorData ?? undefined
    );
  }

  return data as T;
}

export {
  API_BASE_URL,
};