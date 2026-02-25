import React from 'react'
import { ArrowLeft, Bot, Users, Shield, Globe, Zap, DollarSign, ArrowRight, TrendingUp, MapPin, Handshake } from 'lucide-react'
import MarketingFooter from '../components/Footer'
import { useLanguage } from '../context/LanguageContext'

export default function AboutPage() {
  const { t } = useLanguage()

  return (
    <>
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        fontFamily: 'var(--font-body)',
      }}>
        {/* Grid background */}
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundImage: 'linear-gradient(rgba(26,26,26,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(26,26,26,0.03) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          pointerEvents: 'none',
          zIndex: 0,
        }} />

        {/* Nav */}
        <nav style={{
          padding: 'var(--space-4) var(--space-6)',
          position: 'relative',
          zIndex: 10,
          maxWidth: '1200px',
          margin: '0 auto',
        }}>
          <a href="/" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            textDecoration: 'none',
            color: 'var(--text-secondary)',
            fontSize: '14px',
            fontWeight: 500,
          }}>
            <ArrowLeft size={16} />
            {t('about.backToHome')}
          </a>
        </nav>

        {/* Hero */}
        <div style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: '800px',
          margin: '0 auto',
          padding: '40px var(--space-6) 0',
          textAlign: 'center',
        }}>
          <p style={{
            fontSize: '13px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--orange-600)',
            marginBottom: '16px',
          }}>
            {t('about.ourMission')}
          </p>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(32px, 5vw, 48px)',
            fontWeight: 800,
            color: 'var(--text-primary)',
            lineHeight: 1.1,
            marginBottom: '24px',
          }}>
            {t('about.heroTitle')}<br />{t('about.heroTitle2')}
          </h1>
          <p style={{
            fontSize: '18px',
            color: 'var(--text-secondary)',
            lineHeight: 1.7,
            maxWidth: '620px',
            margin: '0 auto',
          }}>
            {t('about.heroSubtitle')}
          </p>
        </div>

        {/* The thesis */}
        <div style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: '900px',
          margin: '0 auto',
          padding: '80px var(--space-6) 0',
        }}>
          <div style={{
            background: 'white',
            border: '1px solid var(--border-primary)',
            borderRadius: '16px',
            padding: 'clamp(32px, 5vw, 56px)',
          }}>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '24px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: '24px',
            }}>
              {t('about.thesisTitle')}
            </h2>
            <p style={{
              fontSize: '16px',
              color: 'var(--text-secondary)',
              lineHeight: 1.8,
              marginBottom: '20px',
            }}>
              {t('about.thesisP1')}
            </p>
            <p style={{
              fontSize: '16px',
              color: 'var(--text-secondary)',
              lineHeight: 1.8,
              marginBottom: '20px',
            }}>
              {t('about.thesisP2')}
            </p>
            <p style={{
              fontSize: '16px',
              color: 'var(--text-secondary)',
              lineHeight: 1.8,
            }}>
              {t('about.thesisP3')}
            </p>
          </div>
        </div>

        {/* Three pillars */}
        <div style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: '900px',
          margin: '0 auto',
          padding: '64px var(--space-6) 0',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '24px',
          }}>
            <div style={{
              background: 'white',
              border: '1px solid var(--border-primary)',
              borderRadius: '16px',
              padding: '36px 28px',
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'rgba(244, 132, 95, 0.1)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
              }}>
                <TrendingUp size={24} color="var(--orange-600)" />
              </div>
              <h3 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '18px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: '12px',
              }}>
                {t('about.pillar1Title')}
              </h3>
              <p style={{
                fontSize: '15px',
                color: 'var(--text-secondary)',
                lineHeight: 1.7,
              }}>
                {t('about.pillar1Desc')}
              </p>
            </div>

            <div style={{
              background: 'white',
              border: '1px solid var(--border-primary)',
              borderRadius: '16px',
              padding: '36px 28px',
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'rgba(244, 132, 95, 0.1)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
              }}>
                <Globe size={24} color="var(--orange-600)" />
              </div>
              <h3 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '18px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: '12px',
              }}>
                {t('about.pillar2Title')}
              </h3>
              <p style={{
                fontSize: '15px',
                color: 'var(--text-secondary)',
                lineHeight: 1.7,
              }}>
                {t('about.pillar2Desc')}
              </p>
            </div>

            <div style={{
              background: 'white',
              border: '1px solid var(--border-primary)',
              borderRadius: '16px',
              padding: '36px 28px',
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'rgba(244, 132, 95, 0.1)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
              }}>
                <Handshake size={24} color="var(--orange-600)" />
              </div>
              <h3 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '18px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: '12px',
              }}>
                {t('about.pillar3Title')}
              </h3>
              <p style={{
                fontSize: '15px',
                color: 'var(--text-secondary)',
                lineHeight: 1.7,
              }}>
                {t('about.pillar3Desc')}
              </p>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: '900px',
          margin: '0 auto',
          padding: '64px var(--space-6) 0',
        }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '24px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: '12px',
            textAlign: 'center',
          }}>
            {t('about.howItWorks')}
          </h2>
          <p style={{
            fontSize: '16px',
            color: 'var(--text-secondary)',
            textAlign: 'center',
            marginBottom: '40px',
          }}>
            {t('about.simpleTransparent')}
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '24px',
          }}>
            {[
              { step: '01', icon: Bot, title: t('about.step1'), desc: t('about.step1Desc') },
              { step: '02', icon: MapPin, title: t('about.step2'), desc: t('about.step2Desc') },
              { step: '03', icon: Shield, title: t('about.step3'), desc: t('about.step3Desc') },
              { step: '04', icon: DollarSign, title: t('about.step4'), desc: t('about.step4Desc') },
            ].map(item => (
              <div key={item.step} style={{
                background: 'white',
                border: '1px solid var(--border-primary)',
                borderRadius: '12px',
                padding: '28px 24px',
              }}>
                <div style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--orange-600)',
                  fontFamily: 'var(--font-mono)',
                  marginBottom: '16px',
                }}>
                  {item.step}
                </div>
                <item.icon size={24} color="var(--text-primary)" style={{ marginBottom: '12px' }} />
                <h3 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '16px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  marginBottom: '8px',
                }}>
                  {item.title}
                </h3>
                <p style={{
                  fontSize: '14px',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Built on trust */}
        <div style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: '900px',
          margin: '0 auto',
          padding: '64px var(--space-6) 0',
        }}>
          <div style={{
            background: 'white',
            border: '1px solid var(--border-primary)',
            borderRadius: '16px',
            padding: 'clamp(32px, 5vw, 56px)',
          }}>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '24px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: '24px',
            }}>
              {t('about.builtOnTrust')}
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '24px',
            }}>
              {[
                { icon: Shield, title: t('about.escrowPayments'), desc: t('about.escrowPaymentsDesc') },
                { icon: Users, title: t('about.verifiedHumansTitle'), desc: t('about.verifiedHumansDesc') },
                { icon: Zap, title: t('about.fairDispute'), desc: t('about.fairDisputeDesc') },
              ].map(item => (
                <div key={item.title}>
                  <item.icon size={20} color="var(--orange-600)" style={{ marginBottom: '12px' }} />
                  <h3 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '15px',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    marginBottom: '6px',
                  }}>
                    {item.title}
                  </h3>
                  <p style={{
                    fontSize: '14px',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.6,
                  }}>
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: '600px',
          margin: '0 auto',
          padding: '80px var(--space-6) 80px',
          textAlign: 'center',
        }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(24px, 4vw, 32px)',
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: '16px',
          }}>
            {t('about.ctaTitle1')}<br />{t('about.ctaTitle2')}
          </h2>
          <p style={{
            fontSize: '16px',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            marginBottom: '32px',
          }}>
            {t('about.ctaSubtitle')}
          </p>
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}>
            <a
              href="/auth"
              className="v4-btn v4-btn-primary"
              style={{ padding: '14px 28px', fontSize: '15px', textDecoration: 'none' }}
            >
              {t('hero.startEarning')}
              <ArrowRight size={18} />
            </a>
            <a
              href="/connect-agent"
              className="v4-btn v4-btn-secondary"
              style={{ padding: '14px 28px', fontSize: '15px', textDecoration: 'none' }}
            >
              <Bot size={18} />
              {t('about.connectAgent')}
            </a>
          </div>
        </div>
      </div>
      <MarketingFooter />
    </>
  )
}
