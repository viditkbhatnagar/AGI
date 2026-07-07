import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Single source of US localization for the AGI Utah program: currency, timezone, date format,
 * and the data region (Utah student data must reside in a US region, FERPA-consistent). All
 * engines and exports route through this. Isolated: `agiutah_localization_profiles` collection.
 */
export interface IAgiUtahLocalizationProfile {
  key: string;
  currency: string;
  timezone: string;
  dateFormat: string;
  dataRegion: string;
}

export interface IAgiUtahLocalizationProfileDocument extends IAgiUtahLocalizationProfile, Document {}

const AgiUtahLocalizationProfileSchema = new Schema<IAgiUtahLocalizationProfileDocument>(
  {
    key: { type: String, required: true, unique: true },
    currency: { type: String, required: true, default: 'USD' },
    timezone: { type: String, required: true, default: 'America/Denver' },
    dateFormat: { type: String, required: true, default: 'MM/DD/YYYY' },
    // Logan confirmed the data region is Utah. On MongoDB Atlas the Utah region is GCP
    // us-west3 (Salt Lake City); provision the cluster there with in-US backups.
    dataRegion: { type: String, required: true, default: 'gcp/us-west3 (Salt Lake City, Utah)' },
  },
  { timestamps: true, collection: 'agiutah_localization_profiles' },
);

export const AgiUtahLocalizationProfile: Model<IAgiUtahLocalizationProfileDocument> =
  (mongoose.models.AgiUtahLocalizationProfile as Model<IAgiUtahLocalizationProfileDocument>) ||
  mongoose.model<IAgiUtahLocalizationProfileDocument>(
    'AgiUtahLocalizationProfile',
    AgiUtahLocalizationProfileSchema,
  );
