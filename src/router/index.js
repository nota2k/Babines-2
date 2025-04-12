import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import PlaylistView from '@/views/PlaylistView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/playlist/:id',
      name: 'playlist',
      component: PlaylistView,
      props: true
    },
    {
      path: '/video',
      name: 'getvideo',
      component: HomeView,
      props: true
    },
  ],
})

export default router
