const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const StorySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true
    },
    content: {
      type: String,
      required: true
    },
    readCount: {
      type: Number,
      default: 0
    },
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
        autopopulate: true
      }
    ],
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    versionKey: false,
    timestamps: true
  }
)

StorySchema.plugin(mongoosePaginate)
module.exports = mongoose.model('Story', StorySchema)
