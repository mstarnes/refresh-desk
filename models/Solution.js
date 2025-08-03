const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SeoDataSchema = new Schema({
  account_id: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
  meta_title: { type: String, default: '' },
  meta_description: { type: String, default: '' },
  meta_keywords: { type: String, default: '' },
});

const ArticleSchema = new Schema({
  id: { type: Number, required: true },
  account_id: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
  position: { type: Number },
  art_type: { type: Number },
  thumbs_up: { type: Number },
  thumbs_down: { type: Number },
  hits: { type: Number },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  folder_id: { type: Number },
  tags: [{ type: Schema.Types.Mixed }],
  title: { type: String },
  description: { type: String },
  user_id: { type: Number },
  status: { type: Number },
  desc_un_html: { type: String },
  seo_data: SeoDataSchema,
  modified_at: { type: Date, default: Date.now },
  modified_by: { type: Number },
});

const FolderSchema = new Schema({
  id: { type: Number, required: true },
  account_id: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
  visibility: { type: Number },
  position: { type: Number },
  is_default: { type: Boolean },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  article_order: { type: Number },
  parent_folder_meta_id: { type: Number, default: null },
  visibility_record_id: { type: Number, default: null },
  height: { type: Number },
  depth: { type: Number },
  category_id: { type: Number },
  name: { type: String },
  description: { type: String },
  articles: [ArticleSchema],
  parent_folder_id: { type: Number, default: null }, // New
  sub_folders_count: { type: Number, default: null }, // New
  articles_count: { type: Number, default: null }, // New
  hierarchy: { type: String, default: null }, // New
  contact_segment_ids: { type: [Number], default: [] }, // New
  company_segment_ids: { type: [Number], default: [] }, // New
});

const SolutionSchema = new Schema({
  id: { type: Number, required: true, unique: true },
  account_id: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
  position: { type: Number },
  is_default: { type: Boolean },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  name: { type: String },
  description: { type: String },
  all_folders: [FolderSchema],
});

module.exports = mongoose.model('Solution', SolutionSchema);