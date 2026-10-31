import { html } from "common-tags";

export const extractCloudinaryFile = (file) => ({
  url: file?.path,
  publicId: file?.filename 
});


export const generateDocumentSubmissionTemplate = (
  sellerName = "Vendeur précieux"
) => {
  return html`
    <div
      style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6; color: #2c3e50;"
    >
      <h2 style="color: #2c3e50;">
        Votre aventure avec Artemia est sur le point de commencer 🚀
      </h2>

      <p>Bonjour ${sellerName},</p>

      <p>
        Vos documents ont été reçus avec succès. Ils sont désormais entre les
        mains de notre équipe de vérification.
      </p>

      <div
        style="background-color: #f0f4f8; padding: 20px; margin: 20px 0; border-left: 4px solid #3498db;"
      >
        <p style="margin: 0 0 10px 0;">
          <strong>Voici ce qui arrive très bientôt :</strong>
        </p>
        <ul style="margin: 0; padding-left: 20px;">
          <li>Une validation rapide par nos experts</li>
          <li>Accès à votre espace vendeur personnalisé</li>
          <li>
            La possibilité de commencer à vendre et à toucher vos premiers
            clients
          </li>
        </ul>
      </div>

      <p>
        Chez <strong>Artemia</strong>, nous savons que chaque minute compte.
        C’est pourquoi nous mettons tout en œuvre pour finaliser votre
        vérification dans les plus brefs délais — souvent sous 48h.
      </p>

      <p>
        Préparez-vous à rejoindre une communauté de vendeurs ambitieux, à
        bénéficier d’outils puissants, et à donner vie à votre boutique sur
        Artemia.
      </p>

      <p style="font-size: 12px; color: #7f8c8d;">
        Une question ? Un doute ? Notre équipe est prête à vous accompagner à
        tout moment.
      </p>

      <p>
        Encore un tout petit instant… et vous serez prêt à briller sur
        <strong>Artemia</strong> !<br />
        <strong>L’équipe support vendeur Artemia</strong>
      </p>
    </div>
  `;
};
// await sendEmail({
//   to: "user@example.com",
//   subject: "Documents reçus – Artemia",
//   htmlBody: generateDocumentSubmissionTemplate("Sophie"),
// });