/**
 * Script de test pour les liked tracks
 * À exécuter dans la console du navigateur
 */

// Test des liked tracks
async function testLikedTracks() {
  console.log('🧪 Test des liked tracks...')

  try {
    // 1. Importer le store
    const { userSpotifyStore } = await import('./src/stores/spotify.js')
    const store = userSpotifyStore()

    console.log('📊 Nombre de liked tracks locaux:', store.likedTracks.length)

    // 2. Tester la sauvegarde
    console.log('💾 Sauvegarde dans MySQL...')
    const result = await store.syncLikedTracksFromAPI('test_user')

    console.log('✅ Résultat:', result)

    // 3. Tester le chargement
    console.log('📥 Chargement depuis MySQL...')
    const loaded = await store.fetchLikedTracks('test_user')

    console.log('📊 Nombre de liked tracks chargés:', loaded.length)

    return { success: true, saved: result, loaded: loaded.length }

  } catch (error) {
    console.error('❌ Erreur:', error)
    return { success: false, error: error.message }
  }
}

// Test direct de l'API
async function testAPI() {
  console.log('🧪 Test direct de l\'API...')

  try {
    // Données de test basées sur votre structure
    const testData = {
      items: [
        {
          track: {
            artist: "Talking Heads",
            title: "Burning Down the House",
            added_at: "2025-04-07T14:34:51Z",
            album: "Burning Down the House / I Get Wild / Wild Gravity",
            track_id: "2VNfJpwdEQBLyXajaa6LWT"
          }
        }
      ]
    }

    const response = await fetch('http://localhost:3000/api/liked/test_user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    })

    const result = await response.json()
    console.log('✅ API Response:', result)

    return result

  } catch (error) {
    console.error('❌ Erreur API:', error)
    return { success: false, error: error.message }
  }
}

// Exécuter les tests
console.log('🚀 Démarrage des tests...')

// Test 1: API directe
testAPI().then(result => {
  console.log('📋 Test API:', result)

  // Test 2: Via le store
  return testLikedTracks()
}).then(result => {
  console.log('📋 Test Store:', result)
  console.log('🎉 Tests terminés !')
}).catch(error => {
  console.error('💥 Erreur générale:', error)
})

// Fonctions disponibles dans la console
window.testLikedTracks = testLikedTracks
window.testAPI = testAPI
