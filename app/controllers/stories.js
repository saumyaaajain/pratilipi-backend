const model = require('../models/story')
const { matchedData } = require('express-validator')
const utils = require('../middleware/utils')
const db = require('../middleware/db')

/*********************
 * Private functions *
 *********************/

/**
 * Checks if a story already exists excluding itself
 * @param {string} id - id of item
 * @param {string} title - title of item
 */
const storyExistsExcludingItself = async (id, title) => {
  return new Promise((resolve, reject) => {
    model.findOne(
      {
        title,
        _id: {
          $ne: id
        }
      },
      (err, item) => {
        utils.itemAlreadyExists(err, item, reject, 'STORY_ALREADY_EXISTS')
        resolve(false)
      }
    )
  })
}

/**
 * Checks if a story already exists in database
 * @param {string} title - title of item
 */
const storyExists = async (title) => {
  return new Promise((resolve, reject) => {
    model.findOne(
      {
        title
      },
      (err, item) => {
        utils.itemAlreadyExists(err, item, reject, 'STORY_ALREADY_EXISTS')
        resolve(false)
      }
    )
  })
}

/**
 * Gets all items from database
 */
const getAllItemsFromDB = async () => {
  return new Promise((resolve, reject) => {
    model.find(
      {},
      '-updatedAt -createdAt',
      {
        sort: {
          title: 1
        }
      },
      (err, items) => {
        if (err) {
          reject(utils.buildErrObject(422, err.message))
        }
        resolve(items)
      }
    )
  })
}

/********************
 * Public functions *
 ********************/

/**
 * Get all items function called by route
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
exports.getAllItems = async (req, res) => {
  try {
    res.status(200).json(await getAllItemsFromDB())
  } catch (error) {
    utils.handleError(res, error)
  }
}

/**
 * Get items function called by route
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
exports.getItems = async (req, res) => {
  try {
    const query = await db.checkQueryString(req.query)
    res.status(200).json(await db.getItems(req, model, query))
  } catch (error) {
    utils.handleError(res, error)
  }
}

/**
 * Get item function called by route
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
exports.getItem = async (req, res) => {
  // mark story as read
  try {
    const currentUser = req.user.id
    req = matchedData(req)
    const id = await utils.isIDGood(req.id)
    const item = await db.getItem(id, model)
    if (!item.readBy.includes(currentUser)) {
      item.readBy.push(currentUser)
      item.readCount += 1
      await db.updateItem(id, model, item)
    }
    res.status(200).json(await db.getItem(id, model))
  } catch (error) {
    utils.handleError(res, error)
  }
}

/**
 * Update item function called by route
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
exports.updateItem = async (req, res) => {
  try {
    const currentUser = req.user.id
    req = matchedData(req)
    const id = await utils.isIDGood(req.id)
    const doesStoryExists = await storyExistsExcludingItself(id, req.title)
    await db.checkItemOwnershipAndReturn(id, model, currentUser)
    if (!doesStoryExists) {
      res.status(200).json(await db.updateItem(id, model, req))
    }
  } catch (error) {
    utils.handleError(res, error)
  }
}

/**
 * Create item function called by route
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
exports.createItem = async (req, res) => {
  try {
    const currentUser = req.user.id
    req = matchedData(req)
    req.owner = currentUser
    const doesStoryExists = await storyExists(req.title)
    if (!doesStoryExists) {
      res.status(201).json(await db.createItem(req, model))
    }
  } catch (error) {
    utils.handleError(res, error)
  }
}

/**
 * Delete item function called by route
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
exports.deleteItem = async (req, res) => {
  try {
    const currentUser = req.user.id
    req = matchedData(req)
    const id = await utils.isIDGood(req.id)
    await db.checkItemOwnershipAndReturn(id, model, currentUser)
    res.status(200).json(await db.deleteItem(id, model))
  } catch (error) {
    utils.handleError(res, error)
  }
}
