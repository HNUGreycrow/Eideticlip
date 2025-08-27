import { createMemoryHistory, createRouter } from "vue-router";

import Layout from "@/layout/index.vue";

const routes = [
  {
    path: "/",
    component: Layout,
    children: [
      { path: "/clipboard", name: "clipboard", component: () => import("@/views/clipboard/index.vue") },
      { path: "/settings", name: "settings", component: () => import("@/views/settings/index.vue") },
      { path: "", redirect: "/clipboard" },
    ],
  },
];

const router = createRouter({
  history: createMemoryHistory(),
  routes,
});

export default router;
