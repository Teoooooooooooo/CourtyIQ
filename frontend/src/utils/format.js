export function formatTime(isoString) {
  return new Date(isoString).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
export function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}
export function formatDateTime(isoString) {
  const d = new Date(isoString);
  return `${d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} · ${formatTime(isoString)}`;
}
export function getInitials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}
export function getAvatarColor(name) {
  const colors = [
    { bg: 'bg-green-100', text: 'text-green-800' },
    { bg: 'bg-blue-100', text: 'text-blue-800' },
    { bg: 'bg-amber-100', text: 'text-amber-800' },
    { bg: 'bg-purple-100', text: 'text-purple-800' },
    { bg: 'bg-pink-100', text: 'text-pink-800' },
  ];
  return colors[name.charCodeAt(0) % colors.length];
}