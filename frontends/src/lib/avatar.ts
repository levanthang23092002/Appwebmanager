/** URL avatar user — dùng ảnh đã lưu hoặc fallback theo tên */
export function getUserAvatarUrl(name: string, avatar?: string | null): string {
  const url = avatar?.trim();
  if (url) return url;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff`;
}
