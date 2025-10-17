import axios from 'axios';

interface CertifierConfig {
  apiKey: string;
  apiVersion: string;
  baseUrl: string;
}

interface CertificateRecipient {
  name: string;
  email: string;
  courseTitle: string;
  courseSlug: string;
  completionDate?: string;
  score?: number;
  courseDuration?: string;
  instructorName?: string;
  studentId?: string;
  institutionName?: string;
}

interface CertifierResponse {
  success: boolean;
  certificateId?: string;
  certificateUrl?: string;
  message?: string;
  error?: string;
}

class CertifierService {
  private config: CertifierConfig;

  constructor() {
    this.config = {
      apiKey: process.env.CERTIFIER_API_KEY || '',
      apiVersion: process.env.CERTIFIER_API_VERSION || '2022-10-26',
      baseUrl: process.env.CERTIFIER_BASE_URL || 'https://api.certifier.io/v1'
    };

    if (!this.config.apiKey) {
      console.warn('⚠️  CERTIFIER_API_KEY not set in environment variables');
    }
  }

  /**
   * Dynamic group selection based on course name
   */
  private selectGroupId(courseTitle: string): string {
    const courseLower = courseTitle.toLowerCase();
    
    // Check for manager-related keywords
    if (courseLower.includes('manager') || courseLower.includes('managers')) {
      return '01k7rrxc2fddy1bkbsx0rt3tgv'; // AGI-Manager group
    }
    
    // Check for professional-related keywords (or default)
    if (courseLower.includes('professional') || courseLower.includes('professionals')) {
      return '01k6fv17x6fw24jgpnvbqervt6'; // AGI-Professional group
    }
    
    // Default to professional group
    return '01k6fv17x6fw24jgpnvbqervt6'; // AGI-Professional group (default)
  }

  /**
   * Process course name for badge (remove "Certified" prefix)
   */
  private processCourseNameForBadge(courseTitle: string): string {
    // Remove "Certified" from the beginning (case-insensitive)
    let processedName = courseTitle.replace(/^certified\s+/i, '');
    
    // Trim any extra whitespace
    processedName = processedName.trim();
    
    return processedName;
  }

  /**
   * Issue a certificate to a student
   */
  async issueCertificate(
    groupId: string,
    recipient: CertificateRecipient
  ): Promise<CertifierResponse> {
    try {
      if (!this.config.apiKey) {
        throw new Error('Certifier API key not configured');
      }

      // Use dynamic group selection instead of passed groupId
      const selectedGroupId = this.selectGroupId(recipient.courseTitle);
      
      // Process course name for badge (remove "Certified")
      const badgeCourseName = this.processCourseNameForBadge(recipient.courseTitle);
      
      console.log('🔧 Certifier API Request:', {
        originalGroupId: groupId,
        selectedGroupId: selectedGroupId,
        recipient: recipient.name,
        email: recipient.email,
        course: recipient.courseTitle,
        badgeCourseName: badgeCourseName
      });

      const requestData = {
        groupId: selectedGroupId,
        recipient: {
          name: recipient.name,
          email: recipient.email
        },
        attributes: {
          'recipient.name': recipient.name,
          'recipient.email': recipient.email,
          'course.title': recipient.courseTitle,
          'course.slug': recipient.courseSlug,
          'completion.date': recipient.completionDate || new Date().toISOString().split('T')[0],
          'score': recipient.score?.toString() || 'N/A'
        },
        customAttributes: {
          'custom.course': recipient.courseTitle,
          'custom.coursename': badgeCourseName // For badge
        }
      };

      console.log('📤 Sending to Certifier:', JSON.stringify(requestData, null, 2));

      const response = await axios.post(
        `${this.config.baseUrl}/credentials`,
        requestData,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Certifier-Version': this.config.apiVersion,
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 second timeout
        }
      );

      console.log('✅ Certificate issued successfully:', {
        recipient: recipient.name,
        course: recipient.courseTitle,
        certificateId: response.data.id
      });

      console.log('🔍 Full Certifier API Response:', JSON.stringify(response.data, null, 2));

      // Generate direct certificate PDF URL based on the publicId or id
      const certificateUrl = response.data.publicId 
        ? `https://app.certifier.io/credentials/${response.data.publicId}.pdf`
        : `https://app.certifier.io/credentials/${response.data.id}.pdf`;

      return {
        success: true,
        certificateId: response.data.id,
        certificateUrl: certificateUrl,
        message: 'Certificate issued successfully'
      };

    } catch (error: any) {
      console.error('❌ Certifier API error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        recipient: recipient.name,
        course: recipient.courseTitle
      });

      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to issue certificate',
        message: `Failed to issue certificate for ${recipient.name}`
      };
    }
  }

  /**
   * Get certificate details by ID
   */
  async getCertificate(certificateId: string): Promise<CertifierResponse> {
    try {
      if (!this.config.apiKey) {
        throw new Error('Certifier API key not configured');
      }

      const response = await axios.get(
        `${this.config.baseUrl}/credentials/${certificateId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Certifier-Version': this.config.apiVersion,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      return {
        success: true,
        certificateId: response.data.id,
        certificateUrl: response.data.url,
        message: 'Certificate retrieved successfully'
      };

    } catch (error: any) {
      console.error('❌ Failed to get certificate:', {
        certificateId,
        error: error.message,
        status: error.response?.status
      });

      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to retrieve certificate'
      };
    }
  }

  /**
   * Verify API connection and credentials
   */
  async verifyConnection(): Promise<boolean> {
    try {
      if (!this.config.apiKey) {
        console.error('❌ Certifier API key not configured');
        return false;
      }

      // Test API connection by making a simple request
      await axios.get(`${this.config.baseUrl}/groups`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Certifier-Version': this.config.apiVersion,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      console.log('✅ Certifier API connection verified');
      return true;

    } catch (error: any) {
      console.error('❌ Certifier API connection failed:', {
        message: error.message,
        status: error.response?.status
      });
      return false;
    }
  }

  /**
   * Get all available groups (for course mapping)
   */
  async getGroups(): Promise<any[]> {
    try {
      if (!this.config.apiKey) {
        throw new Error('Certifier API key not configured');
      }

      const response = await axios.get(`${this.config.baseUrl}/groups`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Certifier-Version': this.config.apiVersion,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      return response.data || [];

    } catch (error: any) {
      console.error('❌ Failed to get groups:', error.message);
      return [];
    }
  }
}

// Export singleton instance
export const certifierService = new CertifierService();
export default certifierService;
