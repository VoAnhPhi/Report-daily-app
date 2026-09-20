import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Heading,
  Text,
  Section,
  Hr,
  Img,
} from '@react-email/components';

interface ViolationDetail {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectedAt: Date;
  location?: string;
  additionalInfo?: string;
}

interface ViolationAlertEmailProps {
  userName: string;
  userEmail: string;
  violationTitle: string;
  violationType: string;
  violationDetails: ViolationDetail[];
  actionRequired?: string;
  deadline?: Date;
  appealProcess?: string;
  supportContact?: string;
  additionalResources?: string[];
}

export const ViolationAlertEmail = ({
  userName = 'Khách hàng',
  userEmail = 'customer@example.com',
  violationTitle = 'Cảnh báo vi phạm quy định',
  violationType = 'Vi phạm chung',
  violationDetails = [],
  actionRequired = 'Vui lòng xem xét và khắc phục các vi phạm được liệt kê bên dưới.',
  deadline,
  appealProcess = 'Nếu bạn không đồng ý với cảnh báo này, bạn có thể liên hệ với đội hỗ trợ để được tư vấn.',
  supportContact = 'lienhe@acta.vn',
  additionalResources = [
    'Điều khoản sử dụng dịch vụ',
    'Quy định cộng đồng',
    'Hướng dẫn tuân thủ',
  ],
}: ViolationAlertEmailProps) => {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getSeverityInfo = (severity: string) => {
    switch (severity) {
      case 'critical':
        return {
          color: '#dc2626',
          bgColor: '#fef2f2',
          borderColor: '#fecaca',
          icon: '🚨',
          label: 'Nghiêm trọng',
        };
      case 'high':
        return {
          color: '#ea580c',
          bgColor: '#fff7ed',
          borderColor: '#fed7aa',
          icon: '⚠️',
          label: 'Cao',
        };
      case 'medium':
        return {
          color: '#d97706',
          bgColor: '#fffbeb',
          borderColor: '#fbbf24',
          icon: '⚡',
          label: 'Trung bình',
        };
      case 'low':
        return {
          color: '#16a34a',
          bgColor: '#f0fdf4',
          borderColor: '#bbf7d0',
          icon: 'ℹ️',
          label: 'Thấp',
        };
      default:
        return {
          color: '#6b7280',
          bgColor: '#f9fafb',
          borderColor: '#d1d5db',
          icon: '📋',
          label: 'Thông tin',
        };
    }
  };

  return (
    <Html lang="vi">
      <Head>
        <meta httpEquiv="Content-Language" content="vi" />
        <meta name="language" content="Vietnamese" />
        <meta name="google" content="notranslate" />
      </Head>
      <Preview>
        {violationTitle} - {violationType} tại ACTA
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header with ACTA logo */}
          <Section style={header}>
            <div style={logoContainer}>
              <a
                href="https://acta.vn"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Img
                  src="https://2evl34cah0.ufs.sh/f/a6wlsorGVg4vCxySMMK6XOR7LjVSTtyk1oFdHKD9E5xfCw3b"
                  alt="ACTA Logo"
                  width="150"
                  height="150"
                  style={logoImage}
                />
              </a>
            </div>
          </Section>

          {/* Main content */}
          <Section style={content}>
            <Heading style={h1}>🚨 {violationTitle}</Heading>

            <Text style={text}>
              Xin chào <strong>{userName}</strong>,
            </Text>

            <Text style={text}>
              Chúng tôi đã phát hiện một số hoạt động có thể vi phạm{' '}
              <strong>quy định và điều khoản sử dụng</strong> của{' '}
              <strong>Liên minh Cộng đồng thực chiến (ACTA)</strong>.
            </Text>

            <Text style={text}>
              <strong>Loại vi phạm:</strong> {violationType}
            </Text>

            {/* Violation Details */}
            {violationDetails.length > 0 && (
              <Section style={violationsSection}>
                <Heading style={sectionTitle}>📋 Chi tiết vi phạm</Heading>
                {violationDetails.map((violation, index) => {
                  const severityInfo = getSeverityInfo(violation.severity);
                  return (
                    <div key={index} style={violationCard}>
                      <div
                        style={{
                          ...violationCardHeader,
                          backgroundColor: severityInfo.bgColor,
                          borderColor: severityInfo.borderColor,
                        }}
                      >
                        <div style={violationHeaderLeft}>
                          <span style={violationIcon}>{severityInfo.icon}</span>
                          <div>
                            <Text style={violationTypeStyle}>
                              {violation.type}
                            </Text>
                            <Text
                              style={{
                                ...violationSeverity,
                                color: severityInfo.color,
                              }}
                            >
                              Mức độ: {severityInfo.label}
                            </Text>
                          </div>
                        </div>
                        <Text style={violationDate}>
                          {formatDate(violation.detectedAt)}
                        </Text>
                      </div>
                      <div style={violationCardBody}>
                        <Text style={violationDescription}>
                          {violation.description}
                        </Text>
                        {violation.location && (
                          <Text style={violationLocation}>
                            <strong>Vị trí:</strong> {violation.location}
                          </Text>
                        )}
                        {violation.additionalInfo && (
                          <Text style={violationAdditional}>
                            <strong>Thông tin bổ sung:</strong>{' '}
                            {violation.additionalInfo}
                          </Text>
                        )}
                      </div>
                    </div>
                  );
                })}
              </Section>
            )}

            {/* Action Required */}
            <Section style={actionSection}>
              <Heading style={sectionTitle}>🎯 Hành động cần thực hiện</Heading>
              <Text style={actionText}>{actionRequired}</Text>
              {deadline && (
                <Text style={deadlineText}>
                  <strong>Hạn chót:</strong> {formatDate(deadline)}
                </Text>
              )}
            </Section>

            {/* Next Steps */}
            <Section style={nextStepsSection}>
              <Heading style={sectionTitle}>📝 Các bước tiếp theo</Heading>
              <Text style={stepText}>
                1. Xem xét kỹ lưỡng các vi phạm được liệt kê
              </Text>
              <Text style={stepText}>
                2. Thực hiện các biện pháp khắc phục cần thiết
              </Text>
              <Text style={stepText}>
                3. Liên hệ hỗ trợ nếu cần tư vấn thêm
              </Text>
              <Text style={stepText}>
                4. Đảm bảo tuân thủ quy định trong tương lai
              </Text>
            </Section>

            {/* Appeal Process */}
            {appealProcess && (
              <Section style={appealSection}>
                <Heading style={sectionTitle}>⚖️ Quy trình khiếu nại</Heading>
                <Text style={appealText}>{appealProcess}</Text>
              </Section>
            )}

            {/* Additional Resources */}
            {additionalResources.length > 0 && (
              <Section style={resourcesSection}>
                <Heading style={sectionTitle}>📚 Tài liệu tham khảo</Heading>
                {additionalResources.map((resource, index) => (
                  <Text key={index} style={resourceText}>
                    • {resource}
                  </Text>
                ))}
              </Section>
            )}

            <Hr style={hr} />

            <Text style={footer}>
              Nếu bạn có bất kỳ câu hỏi nào về cảnh báo này hoặc cần hỗ trợ, vui
              lòng liên hệ với đội hỗ trợ của chúng tôi.
            </Text>

            <Text style={footer}>
              Hỗ trợ khách hàng:{' '}
              <a
                href={`mailto:${supportContact}`}
                style={link}
                target="_blank"
                rel="noreferrer"
              >
                {supportContact}
              </a>{' '}
              hoặc gọi <strong>0912 880 330</strong>
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footerSection}>
            <Text style={footerText}>
              © 2025 ACTA - Affiliate Community's Tactical Alliance
            </Text>
            <Text style={footerText}>Kết nối đỉnh cao, lợi nhuận bền vững</Text>
            <Text style={footerText}>Số điện thoại: 0912 880 330</Text>
            <Text style={footerText}>
              Địa chỉ: 94/21 Võ Oanh, Phường Thạnh Mỹ Tây, TP Hồ Chí Minh, Việt Nam
            </Text>
            <Text style={footerText}>Website: https://acta.vn</Text>
            <Text style={footerText}>
              Bạn nhận được email này vì hệ thống đã phát hiện hoạt động có thể
              vi phạm quy định tại ACTA.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// Styles with beige theme consistent with other templates
const main = {
  backgroundColor: '#fefdf8',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
  boxShadow: '0 4px 20px rgba(221, 191, 148, 0.1)',
  borderRadius: '12px',
  overflow: 'hidden',
};

const header = {
  padding: '30px 40px',
  background: 'linear-gradient(135deg, #f5f5dc 0%, #ddbf94 100%)',
  borderRadius: '12px 12px 0 0',
};

const logoContainer = {
  textAlign: 'center' as const,
};

const logoImage = {
  margin: '0 auto',
  display: 'block',
};

const content = {
  padding: '40px',
};

const h1 = {
  color: '#dc2626',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0 0 24px',
  textAlign: 'center' as const,
};

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 24px',
};

const sectionTitle = {
  color: '#8b4513',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '0 0 16px',
};

const violationsSection = {
  margin: '24px 0',
};

const violationCard = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  margin: '0 0 16px',
  overflow: 'hidden',
  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
};

const violationCardHeader = {
  padding: '16px 20px',
  borderBottom: '1px solid #e5e7eb',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const violationHeaderLeft = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
};

const violationIcon = {
  fontSize: '24px',
};

const violationTypeStyle = {
  color: '#374151',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 4px',
};

const violationSeverity = {
  fontSize: '14px',
  fontWeight: '600',
  margin: '0',
};

const violationDate = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '0',
  fontWeight: '500',
};

const violationCardBody = {
  padding: '16px 20px',
};

const violationDescription = {
  color: '#374151',
  fontSize: '15px',
  lineHeight: '1.5',
  margin: '0 0 12px',
};

const violationLocation = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '0 0 8px',
};

const violationAdditional = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '0',
  fontStyle: 'italic',
};

const actionSection = {
  backgroundColor: '#fffbeb',
  border: '1px solid #fbbf24',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const actionText = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 12px',
};

const deadlineText = {
  color: '#d97706',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0',
};

const nextStepsSection = {
  backgroundColor: '#f0f9ff',
  border: '1px solid #0ea5e9',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const stepText = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '1.5',
  margin: '0 0 8px',
};

const appealSection = {
  backgroundColor: '#f8fafc',
  border: '1px solid #64748b',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const appealText = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0',
};

const resourcesSection = {
  backgroundColor: '#faf8f3',
  border: '1px solid #ddbf94',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const resourceText = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '1.5',
  margin: '0 0 8px',
};

const hr = {
  borderColor: '#ddbf94',
  margin: '32px 0',
};

const footer = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '0 0 16px',
};

const link = {
  color: '#cd853f',
  textDecoration: 'underline',
  fontWeight: '600',
};

const footerSection = {
  padding: '20px 40px',
  background: 'linear-gradient(135deg, #faf8f3 0%, #f5f5dc 100%)',
  borderRadius: '0 0 12px 12px',
  borderTop: '1px solid #ddbf94',
};

const footerText = {
  color: '#8b4513',
  fontSize: '12px',
  lineHeight: '1.4',
  margin: '0 0 8px',
  textAlign: 'center' as const,
};
