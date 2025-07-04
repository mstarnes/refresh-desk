const mongoose = require('mongoose');

const SeoDataSchema = new mongoose.Schema({
  meta_title: { type: String, default: '' },
  meta_description: { type: String, default: '' },
  meta_keywords: { type: String, default: '' },
});

const ArticleSchema = new mongoose.Schema({
  id: { type: Number, required: true },
  position: { type: Number },
  art_type: { type: Number },
  thumbs_up: { type: Number },
  thumbs_down: { type: Number },
  hits: { type: Number },
  created_at: { type: String },
  updated_at: { type: String },
  folder_id: { type: Number },
  tags: [{ type: mongoose.Schema.Types.Mixed }],
  title: { type: String },
  description: { type: String },
  user_id: { type: Number },
  status: { type: Number },
  desc_un_html: { type: String },
  seo_data: SeoDataSchema,
  modified_at: { type: String },
  modified_by: { type: Number },
});

const FolderSchema = new mongoose.Schema({
  id: { type: Number, required: true },
  visibility: { type: Number },
  position: { type: Number },
  is_default: { type: Boolean },
  created_at: { type: String },
  updated_at: { type: String },
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

const SolutionSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  position: { type: Number },
  is_default: { type: Boolean },
  created_at: { type: String },
  updated_at: { type: String },
  account_id: { type: Number },
  name: { type: String },
  description: { type: String },
  all_folders: [FolderSchema],
});

module.exports = mongoose.model('Solution', SolutionSchema);