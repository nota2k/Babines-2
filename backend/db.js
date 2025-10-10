/**
 * Service de connexion et gestion de la base de données MySQL
 * Backend Node.js uniquement
 */

import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

// Configuration de la connexion
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
}

// Pool de connexions
let pool = null

/**
 * Obtenir le pool de connexions
 */
export function getPool() {
  if (!pool) {
    pool = mysql.createPool(dbConfig)
  }
  return pool
}

/**
 * Exécuter une requête SQL
 */
export async function query(sql, params = []) {
  try {
    const connection = getPool()
    const [results] = await connection.execute(sql, params)
    return results
  } catch (error) {
    console.error('Erreur de requête SQL:', error)
    throw error
  }
}

/**
 * Insérer un enregistrement
 */
export async function insert(table, data) {
  const keys = Object.keys(data)
  const values = Object.values(data)
  const placeholders = keys.map(() => '?').join(', ')

  const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`

  try {
    const result = await query(sql, values)
    return result.insertId
  } catch (error) {
    console.error(`Erreur lors de l'insertion dans ${table}:`, error)
    throw error
  }
}

/**
 * Mettre à jour un enregistrement
 */
export async function update(table, data, where) {
  const setClause = Object.keys(data)
    .map(key => `${key} = ?`)
    .join(', ')

  const whereClause = Object.keys(where)
    .map(key => `${key} = ?`)
    .join(' AND ')

  const values = [...Object.values(data), ...Object.values(where)]
  const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`

  try {
    const result = await query(sql, values)
    return result.affectedRows
  } catch (error) {
    console.error(`Erreur lors de la mise à jour de ${table}:`, error)
    throw error
  }
}

/**
 * Supprimer un enregistrement
 */
export async function remove(table, where) {
  const whereClause = Object.keys(where)
    .map(key => `${key} = ?`)
    .join(' AND ')

  const values = Object.values(where)
  const sql = `DELETE FROM ${table} WHERE ${whereClause}`

  try {
    const result = await query(sql, values)
    return result.affectedRows
  } catch (error) {
    console.error(`Erreur lors de la suppression dans ${table}:`, error)
    throw error
  }
}

/**
 * Sélectionner des enregistrements
 */
export async function select(table, where = {}, orderBy = '', limit = null) {
  let sql = `SELECT * FROM ${table}`
  const values = []

  if (Object.keys(where).length > 0) {
    const whereClause = Object.keys(where)
      .map(key => `${key} = ?`)
      .join(' AND ')
    sql += ` WHERE ${whereClause}`
    values.push(...Object.values(where))
  }

  if (orderBy) {
    sql += ` ORDER BY ${orderBy}`
  }

  if (limit) {
    sql += ` LIMIT ${limit}`
  }

  try {
    return await query(sql, values)
  } catch (error) {
    console.error(`Erreur lors de la sélection dans ${table}:`, error)
    throw error
  }
}

/**
 * Tester la connexion à la base de données
 */
export async function testConnection() {
  try {
    const connection = getPool()
    await connection.query('SELECT 1')
    console.log('✓ Connexion à la base de données réussie')
    return true
  } catch (error) {
    console.error('✗ Erreur de connexion à la base de données:', error.message)
    return false
  }
}

/**
 * Fermer le pool de connexions
 */
export async function closePool() {
  if (pool) {
    await pool.end()
    pool = null
  }
}

export default {
  getPool,
  query,
  insert,
  update,
  remove,
  select,
  testConnection,
  closePool
}

