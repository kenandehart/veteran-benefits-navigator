import './App.css'
import { useEffect } from 'react'
import Footer from './Footer'
import SiteHeader from './components/SiteHeader'

function ResourcesPage() {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const hrStyle = { border: 'none', borderTop: '1px solid var(--border-light)', margin: '40px 0' }

  return (
    <div className="page">
      <SiteHeader />
      <main className="privacy-page">
        <h1 className="privacy-page__title">Resources</h1>
        <p>This site can help you discover what benefits you may be eligible for, but it can't answer every question or walk you through every claim. The resources below connect you with people and organizations that can.</p>

        <hr style={hrStyle} />

        <h2 className="privacy-page__heading">Find your local VA</h2>
        <p>The VA Facility Locator shows VA medical centers, regional benefit offices, vet centers, and cemeteries near you. Use it to find a clinic for health care, a regional office to drop off forms or ask questions in person, or a vet center for confidential counseling.</p>
        <p><strong>Visit:</strong> <a href="https://www.va.gov/find-locations/" target="_blank" rel="noopener noreferrer">va.gov/find-locations</a></p>

        <hr style={hrStyle} />

        <h2 className="privacy-page__heading">Get help with a claim</h2>
        <p>Veterans Service Organizations (VSOs) are nonprofits with accredited representatives who help veterans prepare and file claims at no cost. If you have questions about applying for a benefit, gathering evidence, or appealing a decision, a VSO representative is usually the right person to talk to.</p>
        <p>The VA's accredited representative search lets you find a VSO by location.</p>
        <p><strong>Find a representative:</strong> <a href="https://www.va.gov/get-help-from-accredited-representative/find-rep" target="_blank" rel="noopener noreferrer">va.gov/get-help-from-accredited-representative</a></p>

        <hr style={hrStyle} />

        <h2 className="privacy-page__heading">VA general helpline</h2>
        <p>For general questions about benefits, eligibility, or your account, the VA's helpline is staffed Monday through Friday, 8:00 a.m. to 9:00 p.m. ET.</p>
        <p><strong>Call:</strong> <a href="tel:18006982411">1-800-698-2411</a></p>

        <hr style={hrStyle} />

        <h2 className="privacy-page__heading">Caregiver Support Line</h2>
        <p>If you're a family member or friend caring for a veteran, the VA's Caregiver Support Line offers information about resources, programs, and benefits available to you. Open Monday through Friday, 8:00 a.m. to 10:00 p.m. ET, and Saturdays 8:00 a.m. to 5:00 p.m. ET.</p>
        <p><strong>Call:</strong> <a href="tel:18552603274">1-855-260-3274</a></p>

        <hr style={hrStyle} />

        <h2 className="privacy-page__heading">Homeless veterans</h2>
        <p>The National Call Center for Homeless Veterans connects veterans and their families to housing assistance, medical care, and other support, 24 hours a day.</p>
        <p><strong>Call:</strong> <a href="tel:18774243838">1-877-424-3838</a></p>

        <hr style={hrStyle} />

        <h2 className="privacy-page__heading">Veterans Crisis Line</h2>
        <p>If you or a veteran you know is in emotional distress or having thoughts of suicide, the Veterans Crisis Line connects you with caring, qualified responders, 24 hours a day. You don't need to be enrolled in VA health care or registered with the VA to use it.</p>
        <p>
          <strong>Call:</strong> <a href="tel:988">988, then press 1</a><br />
          <strong>Text:</strong> <a href="sms:838255">838255</a><br />
          <strong>Chat online:</strong> <a href="https://www.veteranscrisisline.net/" target="_blank" rel="noopener noreferrer">veteranscrisisline.net</a>
        </p>
      </main>
      <Footer />
    </div>
  )
}

export default ResourcesPage
