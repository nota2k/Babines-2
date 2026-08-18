import { createRouter, createWebHistory } from 'vue-router'
import LibraryView from '@/views/LibraryView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'library', component: LibraryView },
    { path: '/import', name: 'import', component: () => import('@/views/ImportView.vue') },
    { path: '/doublons', name: 'duplicates', component: () => import('@/views/DuplicatesView.vue') },
    { path: '/partage', name: 'share', component: () => import('@/views/ShareTargetView.vue') },
    { path: '/entree/:id', name: 'entry', component: () => import('@/views/EntryView.vue'), props: true },
  ],
})

export default router
