import {
  API_BASE_URL,
  ApiError,
  apiFetch,
  type ApiErrorResponse,
} from "../lib/api";

export type ApiAttachmentUploader = {
  id: string;
  name: string;
  email?: string;
};

export type ApiAttachment = {
  id: string;

  fileName: string;

  mimeType: string;

  fileSize: number;

  uploadedBy:
    ApiAttachmentUploader;

  createdAt: string;

  downloadUrl:
    string;
};

type AttachmentsResponse = {
  success: true;

  data: {
    attachments:
      ApiAttachment[];
  };
};

type UploadAttachmentResponse = {
  success: true;

  message: string;

  data: {
    attachment:
      ApiAttachment;
  };
};

/*
|--------------------------------------------------------------------------
| PARSE API ERROR
|--------------------------------------------------------------------------
*/

async function parseErrorResponse(
  response: Response
) {
  const contentType =
    response.headers.get(
      "content-type"
    );

  let errorData:
    ApiErrorResponse | null =
    null;

  if (
    contentType?.includes(
      "application/json"
    )
  ) {
    try {
      errorData =
        (await response.json()) as
          ApiErrorResponse;
    } catch {
      errorData =
        null;
    }
  }

  throw new ApiError(
    errorData?.message ??
      `Request failed with status ${response.status}.`,
    response.status,
    errorData ??
      undefined
  );
}

/*
|--------------------------------------------------------------------------
| SERVICE
|--------------------------------------------------------------------------
*/

export const attachmentService = {
  /*
  |--------------------------------------------------------------------------
  | GET ATTACHMENTS
  |--------------------------------------------------------------------------
  */

  getAll(
    workspaceId: string,
    projectId: string,
    taskId: string
  ) {
    return apiFetch<AttachmentsResponse>(
      `/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/attachments`
    );
  },

  /*
  |--------------------------------------------------------------------------
  | UPLOAD ATTACHMENT
  |--------------------------------------------------------------------------
  |
  | IMPORTANT:
  |
  | Do NOT manually set:
  |
  | Content-Type: multipart/form-data
  |
  | Browser must generate the boundary automatically.
  |
  | Backend expects:
  |
  | taskUpload.single("file")
  |
  */

  async upload(
    workspaceId: string,
    projectId: string,
    taskId: string,
    file: File
  ): Promise<UploadAttachmentResponse> {
    const formData =
      new FormData();

    /*
     * This field name MUST be "file".
     */
    formData.append(
      "file",
      file,
      file.name
    );

    /*
     * Helpful development check.
     *
     * You should see the actual File
     * object in the browser console.
     */
    console.log(
      "Uploading attachment:",
      {
        name:
          file.name,

        type:
          file.type,

        size:
          file.size,
      }
    );

    const response =
      await fetch(
        `${API_BASE_URL}/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/attachments`,
        {
          method:
            "POST",

          /*
           * Required so the JWT
           * HttpOnly cookie is sent.
           */
          credentials:
            "include",

          /*
           * IMPORTANT:
           *
           * FormData goes directly
           * into fetch().
           *
           * No JSON.stringify().
           */
          body:
            formData,
        }
      );

    if (
      !response.ok
    ) {
      await parseErrorResponse(
        response
      );
    }

    return (
      await response.json()
    ) as UploadAttachmentResponse;
  },

  /*
  |--------------------------------------------------------------------------
  | DOWNLOAD
  |--------------------------------------------------------------------------
  */

  async download(
    workspaceId: string,
    projectId: string,
    taskId: string,
    attachmentId: string,
    fileName: string
  ) {
    const response =
      await fetch(
        `${API_BASE_URL}/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/attachments/${attachmentId}/file`,
        {
          method:
            "GET",

          credentials:
            "include",
        }
      );

    if (
      !response.ok
    ) {
      await parseErrorResponse(
        response
      );
    }

    const blob =
      await response.blob();

    const objectUrl =
      URL.createObjectURL(
        blob
      );

    const link =
      document.createElement(
        "a"
      );

    link.href =
      objectUrl;

    link.download =
      fileName;

    document.body.appendChild(
      link
    );

    link.click();

    link.remove();

    URL.revokeObjectURL(
      objectUrl
    );
  },
};