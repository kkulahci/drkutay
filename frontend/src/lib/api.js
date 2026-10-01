import axios from "axios";

const BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

const client = axios.create({ baseURL: BASE, withCredentials: true });

export function formatApiErrorDetail(detail) {
  if (detail == null) return "Bir hata oluştu. Lütfen tekrar deneyin.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export const api = {
  get: (url, params) => client.get(url, { params }).then((r) => r.data),
  post: (url, data) => client.post(url, data).then((r) => r.data),
  put: (url, data) => client.put(url, data).then((r) => r.data),
  del: (url) => client.delete(url).then((r) => r.data),
};

export default client;
