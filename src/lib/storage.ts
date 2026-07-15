import { getSupabaseClient } from "@/lib/supabase";
import { DEFAULT_WORKSPACE_ID } from "@/lib/workspace-db";

const BUCKET_ATTACHMENTS = "attachments";
const BUCKET_AVATARS = "avatars";

function requireClient() {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase is not configured");
  return client;
}

export const uploadFile = async (
  file: File,
  bucket: string,
  path: string,
  options?: { upsert?: boolean },
) => {
  const supabase = requireClient();
  const fullPath = `${path}/${Date.now()}_${file.name}`;

  const { data, error } = await supabase.storage.from(bucket).upload(fullPath, file, {
    cacheControl: "3600",
    upsert: options?.upsert ?? false,
  });

  if (error) throw error;
  return data;
};

export const getPublicUrl = (bucket: string, path: string) => {
  const supabase = requireClient();
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};

export const getSignedUrl = async (bucket: string, path: string, expiresIn = 3600) => {
  const supabase = requireClient();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
};

export const listFiles = async (bucket: string, path: string) => {
  const supabase = requireClient();
  const { data, error } = await supabase.storage.from(bucket).list(path);
  if (error) throw error;
  return data;
};

export const deleteFile = async (bucket: string, path: string) => {
  const supabase = requireClient();
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw error;
};

export const deleteFiles = async (bucket: string, paths: string[]) => {
  const supabase = requireClient();
  const { error } = await supabase.storage.from(bucket).remove(paths);
  if (error) throw error;
};

export const uploadTicketAttachment = async (
  file: File,
  ticketId: string,
  projectKey: string,
) => {
  const supabase = requireClient();
  const folder = `${projectKey}/tickets/${ticketId}`;
  const result = await uploadFile(file, BUCKET_ATTACHMENTS, folder);
  const url = await getSignedUrl(BUCKET_ATTACHMENTS, result.path);

  const { data, error } = await supabase
    .from("task_attachments")
    .insert({
      workspace_id: DEFAULT_WORKSPACE_ID,
      ticket_id: ticketId,
      file_name: file.name,
      file_path: result.path,
      file_size: file.size,
      file_type: file.type,
      url,
    })
    .select()
    .single();

  if (error) throw error;
  return { file: result, dbRecord: data };
};

export const uploadAvatar = async (file: File, userId: string) => {
  const supabase = requireClient();
  const extension = file.name.split(".").pop() ?? "jpg";
  const path = `${userId}/avatar.${extension}`;

  const { data, error } = await supabase.storage.from(BUCKET_AVATARS).upload(path, file, {
    cacheControl: "3600",
    upsert: true,
  });
  if (error) throw error;

  const url = getPublicUrl(BUCKET_AVATARS, data.path);

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ avatar_url: url })
    .eq("id", userId);
  if (profileError) throw profileError;

  return { path: data.path, url };
};
