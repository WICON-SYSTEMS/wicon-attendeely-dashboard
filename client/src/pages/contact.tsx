import { useMemo } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin, Clock8, LifeBuoy, MessageSquare } from "lucide-react";
import wiconsystemslogo from "@/assets/wicon-logo.png";

export default function ContactPage() {
  const faqs = useMemo(
    () => [
      {
        q: "How do I reset my admin password?",
        a: "Ask a super administrator to reset your credentials or contact WiCon support. For security, password resets require admin verification.",
      },
      {
        q: "Why can't I see some employees in the Payments tab?",
        a: "Only employees with complete profiles and salary data for the selected month/year appear. Ensure employee details and salary setup are complete.",
      },
      {
        q: "Can I export attendance and salary reports?",
        a: "Yes. Use the Reports page to filter by date/department and export. Salaries can also be exported from the Payments page.",
      },
      {
        q: "How do I upload employee photos and generate QR codes?",
        a: "Open Employees → select an employee → Upload image/Generate QR. The system will produce a QR usable for attendance scanning.",
      },
      {
        q: "Which mobile money services are supported?",
        a: "Currently Mobile Money and Orange Money are supported for payouts. Make sure payout credentials are configured by your org.",
      },
    ],
    []
  );

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-13 h-13 rounded-full overflow-hidden bg-muted flex items-center justify-center">
              <img src={wiconsystemslogo} alt="WiCon Systems" className="object-contain w-13 h-13" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Contact & Support</h1>
              <p className="text-muted-foreground mt-1">We’re here to help. Get in touch or browse common questions.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild>
              <a href="mailto:contactwiconsystems@gmail.com" target="_blank" rel="noopener noreferrer">
                <Mail className="w-4 h-4 mr-2" /> Email Support
              </a>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contact Info */}
          <Card className="lg:col-span-1 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><LifeBuoy className="w-5 h-5"/>Support</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-muted-foreground mt-0.5"/>
                <div>
                  <p className="font-medium">Email</p>
                  <a className="text-muted-foreground hover:underline" href="mailto:contactwiconsystems@gmail.com" target="_blank" rel="noopener noreferrer">contactwiconsystems@gmail.com</a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-muted-foreground mt-0.5"/>
                <div>
                  <p className="font-medium">Phone</p>
                  <p className="text-muted-foreground">+237 674 80 29 71</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock8 className="w-5 h-5 text-muted-foreground mt-0.5"/>
                <div>
                  <p className="font-medium">Office Hours</p>
                  <p className="text-muted-foreground">Mon–Fri, 9:00–17:00 (WAT)</p>
                </div>
              </div>
              <Separator />
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-muted-foreground mt-0.5"/>
                <div>
                  <p className="font-medium">Office Address</p>
                  <p className="text-muted-foreground">WiCon Systems Headquarters</p>
                  <p className="text-muted-foreground">Buea, Southwest Region</p>
                  <p className="text-muted-foreground">Cameroon</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Company / Message */}
          <Card className="lg:col-span-2 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><MessageSquare className="w-5 h-5"/>About WiCon Systems</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                WiCon Systems builds modern workforce and attendance solutions tailored for organizations of all sizes. Our mission is to help teams save time,
                gain operational visibility, and automate repetitive administrative tasks with secure, reliable platforms.
              </p>
              <p className="text-muted-foreground">
                The MINJEC Attendance System is engineered for accuracy and scalability, from employee onboarding to attendance tracking, payroll calculations,
                and reporting. We actively collaborate with stakeholders to deliver features that matter and support that you can count on.
              </p>
              <p className="text-muted-foreground">
                For partnership inquiries, custom integrations, or dedicated support plans, please reach out to us. We’d love to work with you.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* FAQs */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((f, i) => (
                <AccordionItem key={i} value={`item-${i}`}>
                  <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
