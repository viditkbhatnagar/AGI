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

  // Slugs of CPD-accredited courses (per CPD Standards Office Multiple Submission).
  // CPD courses route to a parallel set of Certifier groups whose design is the
  // CPD-certified template; the badge tier (director/manager/professional) is still
  // selected by keyword on the course title.
  private static readonly CPD_COURSE_SLUGS = new Set<string>([
    'Certified-Human-Resource-Professional',          // CHRP
    'certified-human-resource-manager',               // CHRM
    'Certified-Logistics-Manager',                    // CLM
    'Certified-Sustainability-And-Leadership',        // Sustainability L&M
    'Certified-Project-Management-Professional',      // CPMP
    'Certified-Project-Manager',                      // CPM
    'certified-supply-chain-professional',            // CSCP
    'certified-digital-marketing-professional',       // CDMP
    'certified-purchasing-and-procurement-professional', // CPPP (legacy slug)
    'Certified-Purchasing-and-Procurement-Professional', // CPPP (current slug)
  ]);

  /**
   * Dynamic group selection based on course name and CPD eligibility.
   * Tier (director/manager/professional) is picked by title keyword;
   * CPD vs non-CPD is picked by slug membership in CPD_COURSE_SLUGS.
   */
  private selectGroupId(courseTitle: string, courseSlug?: string): string {
    const courseLower = courseTitle.toLowerCase();
    const isCpd = courseSlug ? CertifierService.CPD_COURSE_SLUGS.has(courseSlug) : false;

    if (courseLower.includes('director') || courseLower.includes('directors')) {
      return isCpd
        ? '01kr13vgmszbrqfz74dhzxa94m'  // AGI-Director-CPD
        : '01k7s2jdz7x947af5s80xpfqnm'; // AGI-Director
    }

    if (courseLower.includes('manager') || courseLower.includes('managers')) {
      return isCpd
        ? '01kr13xt9f10qdapz81q4qt414'  // AGI-Manager-CPD
        : '01k7rrxc2fddy1bkbsx0rt3tgv'; // AGI-Manager
    }

    // Professional (or default fallback)
    return isCpd
      ? '01kr13zg22m68bkqzenhy8v0g9'  // AGI-Professional-CPD
      : '01k6fv17x6fw24jgpnvbqervt6'; // AGI-Professional
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
      const selectedGroupId = this.selectGroupId(recipient.courseTitle, recipient.courseSlug);
      
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
