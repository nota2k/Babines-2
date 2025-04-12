import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import PlaylistList from '@/components/playlists/PlaylistList.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      props: true
    },
    {
      path: '/playlist/:id',
      name: 'playlist',
      component: HomeView,
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
