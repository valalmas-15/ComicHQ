export function formatRelativeTime(dateString) {
  const date = new Date(dateString.replace(" ", "T") + "Z"); // Ensure ISO format for consistent parsing
  const now = new Date();
  const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSeconds < 60) {
    return `${diffSeconds} detik lalu`;
  } else if (diffSeconds < 3600) {
    const minutes = Math.floor(diffSeconds / 60);
    return `${minutes} menit lalu`;
  } else if (diffSeconds < 86400) {
    const hours = Math.floor(diffSeconds / 3600);
    return `${hours} jam lalu`;
  } else if (diffSeconds < 2592000) {
    // 30 days
    const days = Math.floor(diffSeconds / 86400);
    return `${days} hari lalu`;
  } else {
    return date.toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
}
