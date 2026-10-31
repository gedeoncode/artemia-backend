const { html } = require("common-tags");

module.exports = {
  /**
   * OTP Verification Email
   * @param {string} otp - The OTP code
   * @param {number} expiryMinutes - OTP expiry time in minutes
   * @param {string} locale - Language preference ('fr' or 'en')
   * @param {string} ipAddress - User's IP address for security
   */
  OTP: (otp, expiryMinutes = 5, locale = "fr", ipAddress = null) => {
    const templates = {
      fr: {
        subject: "Votre code de vérification Artemia",
        html: html`
          <div
            style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;"
          >
            <div
              style="background-color: #f8f9fa; padding: 20px; text-align: center; border-bottom: 1px solid #e9ecef;"
            >
              <h1 style="color: #2c3e50; margin: 0;">Code de Vérification</h1>
            </div>

            <div style="padding: 30px;">
              <p>Bonjour,</p>
              <p>Voici votre code de vérification à usage unique :</p>

              <div
                style="background-color: #f8f9fa; padding: 15px; text-align: center; margin: 20px 0; border-radius: 4px; font-size: 24px; font-weight: bold; color: #3498db;"
              >
                ${otp}
              </div>

              <p>
                Ce code est valable pendant
                <strong>${expiryMinutes} minutes</strong>.
              </p>

              ${ipAddress
                ? `<p style="font-size: 12px; color: #6c757d;">Demande effectuée depuis l'adresse IP: ${ipAddress}</p>`
                : ""}

              <p>
                Si vous n'avez pas demandé ce code, veuillez ignorer cet email
                ou contacter notre support.
              </p>

              <p style="margin-top: 30px;">
                Cordialement,<br />L'équipe Artemia
              </p>
            </div>

            <div
              style="background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; border-top: 1px solid #e9ecef;"
            >
              © ${new Date().getFullYear()} Artemia. Tous droits réservés.
            </div>
          </div>
        `,
      },
      en: {
        subject: "Your Artemia Verification Code",
        html: html`
          <div
            style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;"
          >
            <div
              style="background-color: #f8f9fa; padding: 20px; text-align: center; border-bottom: 1px solid #e9ecef;"
            >
              <h1 style="color: #2c3e50; margin: 0;">Verification Code</h1>
            </div>

            <div style="padding: 30px;">
              <p>Hello,</p>
              <p>Here is your one-time verification code:</p>

              <div
                style="background-color: #f8f9fa; padding: 15px; text-align: center; margin: 20px 0; border-radius: 4px; font-size: 24px; font-weight: bold; color: #3498db;"
              >
                ${otp}
              </div>

              <p>
                This code is valid for
                <strong>${expiryMinutes} minutes</strong>.
              </p>

              ${ipAddress
                ? `<p style="font-size: 12px; color: #6c757d;">Request originated from IP: ${ipAddress}</p>`
                : ""}

              <p>
                If you didn't request this code, please ignore this email or
                contact our support team.
              </p>

              <p style="margin-top: 30px;">
                Best regards,<br />The Artemia Team
              </p>
            </div>

            <div
              style="background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; border-top: 1px solid #e9ecef;"
            >
              © ${new Date().getFullYear()} Artemia. All rights reserved.
            </div>
          </div>
        `,
      },
    };
    return templates[locale] || templates.fr;
  },

  /**
   * Seller Registration Approval
   * @param {string} sellerName - Name of the seller
   * @param {string} locale - Language preference ('fr' or 'en')
   */
  SELLER_REGISTRATION_APPROVAL: (sellerName, locale = "fr") => {
    const templates = {
      fr: {
        subject: "Félicitations ! Votre compte vendeur a été approuvé",
        html: html`
          <div
            style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;"
          >
            <div
              style="background-color: #f8f9fa; padding: 20px; text-align: center; border-bottom: 1px solid #e9ecef;"
            >
              <h1 style="color: #2c3e50; margin: 0;">
                Compte Vendeur Approuvé
              </h1>
            </div>

            <div style="padding: 30px;">
              <p>Bonjour ${sellerName},</p>

              <p>
                Nous sommes ravis de vous informer que votre inscription en tant
                que vendeur sur Artemia a été approuvée !
              </p>

              <p style="margin: 20px 0;">
                <a
                  href="${process.env.APP_URL}/seller/dashboard"
                  style="background-color: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;"
                >
                  Accéder à votre tableau de bord
                </a>
              </p>

              <p>Vous pouvez maintenant :</p>
              <ul>
                <li>Ajouter vos produits</li>
                <li>Gérer vos stocks</li>
                <li>Recevoir des commandes</li>
              </ul>

              <p>
                Si vous avez des questions, notre équipe de support est à votre
                disposition.
              </p>

              <p style="margin-top: 30px;">
                Bienvenue dans notre communauté de vendeurs !
              </p>
              <p>Cordialement,<br />L'équipe Artemia</p>
            </div>

            <div
              style="background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; border-top: 1px solid #e9ecef;"
            >
              © ${new Date().getFullYear()} Artemia. Tous droits réservés.
            </div>
          </div>
        `,
      },
      en: {
        subject: "Congratulations! Your seller account has been approved",
        html: html`
          <div
            style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;"
          >
            <div
              style="background-color: #f8f9fa; padding: 20px; text-align: center; border-bottom: 1px solid #e9ecef;"
            >
              <h1 style="color: #2c3e50; margin: 0;">
                Seller Account Approved
              </h1>
            </div>

            <div style="padding: 30px;">
              <p>Hello ${sellerName},</p>

              <p>
                We're excited to inform you that your seller registration on
                Artemia has been approved!
              </p>

              <p style="margin: 20px 0;">
                <a
                  href="${process.env.APP_URL}/seller/dashboard"
                  style="background-color: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;"
                >
                  Access Your Dashboard
                </a>
              </p>

              <p>You can now:</p>
              <ul>
                <li>Add your products</li>
                <li>Manage your inventory</li>
                <li>Receive orders</li>
              </ul>

              <p>
                If you have any questions, our support team is here to help.
              </p>

              <p style="margin-top: 30px;">Welcome to our seller community!</p>
              <p>Best regards,<br />The Artemia Team</p>
            </div>

            <div
              style="background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; border-top: 1px solid #e9ecef;"
            >
              © ${new Date().getFullYear()} Artemia. All rights reserved.
            </div>
          </div>
        `,
      },
    };
    return templates[locale] || templates.fr;
  },
  //order confirmation for buyer
  ORDER_CONFIRMATION: (
    orderNumber,
    customerName,
    items,
    totalAmount,
    locale = "fr"
  ) => {
    const formatCurrency = (amount) => {
      return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
        style: "currency",
        currency: "EUR",
      }).format(amount);
    };

    const templates = {
      fr: {
        subject: `✅ Confirmation de commande #${orderNumber} - Artemia`,
        html: html`
          <div
            style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #333333; line-height: 1.6;"
          >
            <!-- Header with logo and order confirmation -->
            <div
              style="background-color: #2563eb; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;"
            >
              <div
                style="display: inline-block; background-color: white; padding: 12px; border-radius: 50%; margin-bottom: 15px;"
              >
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M22 11.08V12C21.9988 14.1564 21.3005 16.2547 20.0093 17.9818C18.7182 19.709 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.87979 13.4881 2.02168 11.3363C2.16356 9.18455 2.99721 7.13631 4.39828 5.49706C5.79935 3.85781 7.69279 2.71537 9.79619 2.24013C11.8996 1.7649 14.1003 1.98232 16.07 2.86"
                    stroke="#2563eb"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M22 4L12 14.01L9 11.01"
                    stroke="#2563eb"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </div>
              <h1
                style="color: white; margin: 0; font-size: 24px; font-weight: 600;"
              >
                Merci pour votre commande
              </h1>
              <p
                style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 16px;"
              >
                Votre commande #${orderNumber} est confirmée
              </p>
            </div>

            <!-- Order summary -->
            <div style="padding: 30px; background-color: white;">
              <div
                style="display: flex; align-items: center; margin-bottom: 25px;"
              >
                <div
                  style="background-color: #f0f9ff; border-radius: 8px; padding: 12px; margin-right: 15px;"
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M20 7H4V5H20V7Z" fill="#2563eb" />
                    <path
                      fill-rule="evenodd"
                      clip-rule="evenodd"
                      d="M1 9H23V19C23 20.1046 22.1046 21 21 21H3C1.89543 21 1 20.1046 1 19V9ZM3 11H21V19H3V11Z"
                      fill="#2563eb"
                    />
                    <path
                      d="M12 13C13.1046 13 14 12.1046 14 11C14 9.89543 13.1046 9 12 9C10.8954 9 10 9.89543 10 11C10 12.1046 10.8954 13 12 13Z"
                      fill="#2563eb"
                    />
                  </svg>
                </div>
                <div>
                  <p style="margin: 0; font-size: 14px; color: #6b7280;">
                    Numéro de commande
                  </p>
                  <p
                    style="margin: 4px 0 0; font-size: 18px; font-weight: 600; color: #111827;"
                  >
                    #${orderNumber}
                  </p>
                </div>
              </div>

              <div
                style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 30px;"
              >
                <div
                  style="background-color: #f9fafb; padding: 12px 16px; border-bottom: 1px solid #e5e7eb;"
                >
                  <h3
                    style="margin: 0; font-size: 16px; font-weight: 600; color: #111827;"
                  >
                    Récapitulatif de commande
                  </h3>
                </div>

                <div style="padding: 0;">
                  ${items
                    .map(
                      (item) => `
                    <div style="display: flex; justify-content: space-between; padding: 16px; border-bottom: 1px solid #e5e7eb;">
                      <div style="flex: 1;">
                        <p style="margin: 0 0 4px; font-weight: 500; color: #111827;">${
                          item.name
                        }</p>
                        <p style="margin: 0; font-size: 14px; color: #6b7280;">Quantité: ${
                          item.quantity
                        }</p>
                      </div>
                      <div style="text-align: right;">
                        <p style="margin: 0; font-weight: 500; color: #111827;">${formatCurrency(
                          item.price * item.quantity
                        )}</p>
                        <p style="margin: 4px 0 0; font-size: 14px; color: #6b7280;">${formatCurrency(
                          item.price
                        )}/unité</p>
                      </div>
                    </div>
                  `
                    )
                    .join("")}
                </div>

                <div
                  style="padding: 16px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;"
                >
                  <div
                    style="display: flex; justify-content: space-between; align-items: center;"
                  >
                    <p style="margin: 0; font-weight: 600;">Total</p>
                    <p
                      style="margin: 0; font-size: 18px; font-weight: 600; color: #111827;"
                    >
                      ${formatCurrency(totalAmount)}
                    </p>
                  </div>
                </div>
              </div>

              <!-- Next steps -->
              <div
                style="background-color: #f0f9ff; border-radius: 8px; padding: 20px; margin-bottom: 30px; border-left: 4px solid #2563eb;"
              >
                <div style="display: flex;">
                  <div style="margin-right: 12px; color: #2563eb;">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                        stroke="#2563eb"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                      <path
                        d="M12 8V12L16 16"
                        stroke="#2563eb"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3
                      style="margin: 0 0 8px; font-size: 16px; font-weight: 600; color: #111827;"
                    >
                      Prochaines étapes
                    </h3>
                    <p style="margin: 0; color: #4b5563;">
                      Nous préparons votre commande. Vous recevrez une
                      notification lorsque votre colis sera expédié.
                    </p>
                  </div>
                </div>
              </div>

              <!-- CTA button -->
              <div style="text-align: center; margin-bottom: 30px;">
                <a
                  href="${process.env.APP_URL}/user/orders"
                  style="display: inline-block; background-color: #2563eb; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; transition: background-color 0.3s;"
                >
                  <span
                    style="display: flex; align-items: center; justify-content: center;"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      style="margin-right: 8px;"
                    >
                      <path
                        d="M9 20H4C3.46957 20 2.96086 19.7893 2.58579 19.4142C2.21071 19.0391 2 18.5304 2 18V8C2 7.46957 2.21071 6.96086 2.58579 6.58579C2.96086 6.21071 3.46957 6 4 6H9"
                        stroke="white"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                      <path
                        d="M16 4H20C20.5304 4 21.0391 4.21071 21.4142 4.58579C21.7893 4.96086 22 5.46957 22 6V16C22 16.5304 21.7893 17.0391 21.4142 17.4142C21.0391 17.7893 20.5304 18 20 18H16"
                        stroke="white"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                      <path
                        d="M16 10L12 6L8 10"
                        stroke="white"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                      <path
                        d="M12 6V18"
                        stroke="white"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                    Voir ma commande
                  </span>
                </a>
              </div>

              <!-- Footer -->
              <div
                style="text-align: center; font-size: 14px; color: #6b7280; padding-top: 20px; border-top: 1px solid #e5e7eb;"
              >
                <p style="margin: 0 0 8px;">
                  Des questions concernant votre commande ?
                </p>
                <p style="margin: 0;">
                  <a
                    href="mailto:support@artemia.com"
                    style="color: #2563eb; text-decoration: none;"
                    >Contactez notre équipe</a
                  >
                </p>
              </div>
            </div>

            <!-- Copyright -->
            <div
              style="text-align: center; padding: 20px; font-size: 12px; color: #9ca3af;"
            >
              <p style="margin: 0;">
                © ${new Date().getFullYear()} Artemia. Tous droits réservés.
              </p>
            </div>
          </div>
        `,
      },
      en: {
        subject: `Your Order Confirmation #${orderNumber}`,
        html: html`
          <div
            style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;"
          >
            <div
              style="background-color: #f8f9fa; padding: 20px; text-align: center; border-bottom: 1px solid #e9ecef;"
            >
              <h1 style="color: #2c3e50; margin: 0;">Order Confirmation</h1>
            </div>

            <div style="padding: 30px;">
              <p>Hello ${customerName},</p>
              <p>
                Thank you for your order on Artemia. Here are the details of
                your order <strong>#${orderNumber}</strong>:
              </p>

              <table
                style="width: 100%; border-collapse: collapse; margin: 20px 0;"
              >
                <thead>
                  <tr style="background-color: #f8f9fa;">
                    <th
                      style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;"
                    >
                      Item
                    </th>
                    <th
                      style="padding: 10px; text-align: right; border-bottom: 1px solid #ddd;"
                    >
                      Price
                    </th>
                    <th
                      style="padding: 10px; text-align: right; border-bottom: 1px solid #ddd;"
                    >
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  ${items
                    .map(
                      (item) => `
                    <tr>
                      <td style="padding: 10px; border-bottom: 1px solid #eee;">${
                        item.name
                      } × ${item.quantity}</td>
                      <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee;">${formatCurrency(
                        item.price
                      )}</td>
                      <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee;">${formatCurrency(
                        item.price * item.quantity
                      )}</td>
                    </tr>
                  `
                    )
                    .join("")}
                </tbody>
                <tfoot>
                  <tr>
                    <td
                      colspan="2"
                      style="padding: 10px; text-align: right; font-weight: bold;"
                    >
                      Total
                    </td>
                    <td
                      style="padding: 10px; text-align: right; font-weight: bold;"
                    >
                      ${formatCurrency(totalAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>

              <p>
                You can track your order status in your
                <a href="${process.env.APP_URL}/account/orders">account area</a
                >.
              </p>

              <p style="margin-top: 30px;">
                Best regards,<br />The Artemia Team
              </p>
            </div>

            <div
              style="background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; border-top: 1px solid #e9ecef;"
            >
              © ${new Date().getFullYear()} Artemia. All rights reserved.
            </div>
          </div>
        `,
      },
    };
    return templates[locale] || templates.fr;
  },

  //order confirmation for seller
  ORDER_CONFIRMATION_SELLER: (
    orderNumber,
    customerName,
    items,
    totalAmount,
    sellerName,
    phoneNumber,
    email,
    address,
    locale = "fr"
  ) => {
    const formatCurrency = (amount) => {
      return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", {
        style: "currency",
        currency: "EUR",
      }).format(amount);
    };

    const templates = {
      fr: {
        subject: `📦 Nouvelle commande #${orderNumber} - Préparez l'expédition`,
        html: html`
          <div
            style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #333333; line-height: 1.6;"
          >
            <!-- Header with logo -->
            <div
              style="background-color: #2563eb; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;"
            >
              <div
                style="display: inline-block; background-color: white; padding: 12px; border-radius: 50%; margin-bottom: 15px;"
              >
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M20 7H4V5H20V7Z" fill="#2563eb" />
                  <path
                    fill-rule="evenodd"
                    clip-rule="evenodd"
                    d="M1 9H23V19C23 20.1046 22.1046 21 21 21H3C1.89543 21 1 20.1046 1 19V9ZM3 11H21V19H3V11Z"
                    fill="#2563eb"
                  />
                  <path
                    d="M12 13C13.1046 13 14 12.1046 14 11C14 9.89543 13.1046 9 12 9C10.8954 9 10 9.89543 10 11C10 12.1046 10.8954 13 12 13Z"
                    fill="#2563eb"
                  />
                </svg>
              </div>
              <h1
                style="color: white; margin: 0; font-size: 24px; font-weight: 600;"
              >
                Nouvelle commande reçue
              </h1>
              <p
                style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 16px;"
              >
                Préparez-vous à expédier
              </p>
            </div>

            <!-- Order summary -->
            <div style="padding: 30px; background-color: white;">
              <div
                style="display: flex; align-items: center; margin-bottom: 25px;"
              >
                <div
                  style="background-color: #f0f9ff; border-radius: 8px; padding: 12px; margin-right: 15px;"
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                      stroke="#2563eb"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M12 8V12L15 15"
                      stroke="#2563eb"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </div>
                <div>
                  <p style="margin: 0; font-size: 14px; color: #6b7280;">
                    Numéro de commande
                  </p>
                  <p
                    style="margin: 4px 0 0; font-size: 18px; font-weight: 600; color: #111827;"
                  >
                    #${orderNumber}
                  </p>
                </div>
              </div>

              <div
                style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 30px;"
              >
                <div
                  style="background-color: #f9fafb; padding: 12px 16px; border-bottom: 1px solid #e5e7eb;"
                >
                  <h3
                    style="margin: 0; font-size: 16px; font-weight: 600; color: #111827;"
                  >
                    Détails de la commande
                  </h3>
                </div>

                <div style="padding: 0;">
                  ${items
                    .map(
                      (item) => `
                    <div style="display: flex; justify-content: space-between; padding: 16px; border-bottom: 1px solid #e5e7eb;">
                      <div style="flex: 1;">
                        <p style="margin: 0 0 4px; font-weight: 500; color: #111827;">${
                          item.name
                        }</p>
                        <p style="margin: 0; font-size: 14px; color: #6b7280;">Quantité: ${
                          item.quantity
                        }</p>
                      </div>
                      <div style="text-align: right;">
                        <p style="margin: 0; font-weight: 500; color: #111827;">${formatCurrency(
                          item.price * item.quantity
                        )}</p>
                        <p style="margin: 4px 0 0; font-size: 14px; color: #6b7280;">${formatCurrency(
                          item.price
                        )}/unité</p>
                      </div>
                    </div>
                  `
                    )
                    .join("")}
                </div>

                <div
                  style="padding: 16px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;"
                >
                  <div
                    style="display: flex; justify-content: space-between; align-items: center;"
                  >
                    <p style="margin: 0; font-weight: 600;">Total</p>
                    <p
                      style="margin: 0; font-size: 18px; font-weight: 600; color: #111827;"
                    >
                      ${formatCurrency(totalAmount)}
                    </p>
                  </div>
                </div>
              </div>

              <!-- Customer info -->
              <div
                style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 30px;"
              >
                <div
                  style="background-color: #f9fafb; padding: 12px 16px; border-bottom: 1px solid #e5e7eb;"
                >
                  <h3
                    style="margin: 0; font-size: 16px; font-weight: 600; color: #111827;"
                  >
                    Informations client
                  </h3>
                </div>

                <div style="padding: 16px;">
                  <div style="display: flex; margin-bottom: 12px;">
                    <div style="margin-right: 12px; color: #6b7280;">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M20 21V19C20 16.7909 18.2091 15 16 15H8C5.79086 15 4 16.7909 4 19V21"
                          stroke="#6b7280"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                        <path
                          fill-rule="evenodd"
                          clip-rule="evenodd"
                          d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z"
                          stroke="#6b7280"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>
                    </div>
                    <div>
                      <p
                        style="margin: 0 0 4px; font-weight: 500; color: #111827;"
                      >
                        ${customerName}
                      </p>
                      <p style="margin: 0; font-size: 14px; color: #6b7280;">
                        Client
                      </p>
                    </div>
                  </div>

                  <div style="display: flex; margin-bottom: 12px;">
                    <div style="margin-right: 12px; color: #6b7280;">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M22 16.92V19C22 20.1046 21.1046 21 20 21H4C2.89543 21 2 20.1046 2 19V16.92"
                          stroke="#6b7280"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                        <path
                          d="M18 9C18 12.3137 15.3137 15 12 15C8.68629 15 6 12.3137 6 9"
                          stroke="#6b7280"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                        <path
                          d="M4 7H20"
                          stroke="#6b7280"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                        <path
                          d="M15 2H9C7.89543 2 7 2.89543 7 4V5C7 6.10457 7.89543 7 9 7H15C16.1046 7 17 6.10457 17 5V4C17 2.89543 16.1046 2 15 2Z"
                          stroke="#6b7280"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>
                    </div>
                    <div>
                      <p
                        style="margin: 0 0 4px; font-weight: 500; color: #111827;"
                      >
                        ${phoneNumber}
                      </p>
                      <p style="margin: 0; font-size: 14px; color: #6b7280;">
                        Téléphone
                      </p>
                    </div>
                  </div>

                  <div style="display: flex; margin-bottom: 12px;">
                    <div style="margin-right: 12px; color: #6b7280;">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z"
                          stroke="#6b7280"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                        <path
                          d="M22 6L12 13L2 6"
                          stroke="#6b7280"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>
                    </div>
                    <div>
                      <p
                        style="margin: 0 0 4px; font-weight: 500; color: #111827;"
                      >
                        <a
                          href="mailto:${email}"
                          style="color: #2563eb; text-decoration: none;"
                          >${email}</a
                        >
                      </p>
                      <p style="margin: 0; font-size: 14px; color: #6b7280;">
                        Email
                      </p>
                    </div>
                  </div>

                  <div style="display: flex;">
                    <div style="margin-right: 12px; color: #6b7280;">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M21 10C21 17 12 23 12 23C12 23 3 17 3 10C3 7.61305 3.94821 5.32387 5.63604 3.63604C7.32387 1.94821 9.61305 1 12 1C14.3869 1 16.6761 1.94821 18.364 3.63604C20.0518 5.32387 21 7.61305 21 10Z"
                          stroke="#6b7280"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                        <path
                          d="M12 13C13.6569 13 15 11.6569 15 10C15 8.34315 13.6569 7 12 7C10.3431 7 9 8.34315 9 10C9 11.6569 10.3431 13 12 13Z"
                          stroke="#6b7280"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>
                    </div>
                    <div>
                      <p
                        style="margin: 0 0 4px; font-weight: 500; color: #111827;"
                      >
                        Adresse de livraison
                      </p>
                      <p style="margin: 0; font-size: 14px; color: #6b7280;">
                        ${address?.addressLine || "N/A"}<br />
                        ${address?.city || ""}<br />
                        ${address?.notes
                          ? `<span style="color: #9ca3af;">Note: ${address.notes}</span>`
                          : ""}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Action card -->
              <div
                style="background-color: #f0f9ff; border-radius: 8px; padding: 20px; margin-bottom: 30px; border-left: 4px solid #2563eb;"
              >
                <div style="display: flex;">
                  <div style="margin-right: 12px; color: #2563eb;">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                        stroke="#2563eb"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                      <path
                        d="M12 8V12L16 16"
                        stroke="#2563eb"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3
                      style="margin: 0 0 8px; font-size: 16px; font-weight: 600; color: #111827;"
                    >
                      Prochaine étape
                    </h3>
                    <p style="margin: 0; color: #4b5563;">
                      Contactez le client dans les 24 heures pour confirmer les
                      détails de livraison. Préparez la commande pour expédition
                      dès que possible.
                    </p>
                  </div>
                </div>
              </div>

              <!-- CTA button -->
              <div style="text-align: center; margin-bottom: 30px;">
                <a
                  href="${process.env.APP_URL}/seller/orders"
                  style="display: inline-block; background-color: #2563eb; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; transition: background-color 0.3s;"
                >
                  <span
                    style="display: flex; align-items: center; justify-content: center;"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      style="margin-right: 8px;"
                    >
                      <path
                        d="M9 20H4C3.46957 20 2.96086 19.7893 2.58579 19.4142C2.21071 19.0391 2 18.5304 2 18V8C2 7.46957 2.21071 6.96086 2.58579 6.58579C2.96086 6.21071 3.46957 6 4 6H9"
                        stroke="white"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                      <path
                        d="M16 4H20C20.5304 4 21.0391 4.21071 21.4142 4.58579C21.7893 4.96086 22 5.46957 22 6V16C22 16.5304 21.7893 17.0391 21.4142 17.4142C21.0391 17.7893 20.5304 18 20 18H16"
                        stroke="white"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                      <path
                        d="M16 10L12 6L8 10"
                        stroke="white"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                      <path
                        d="M12 6V18"
                        stroke="white"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                    Accéder à la commande
                  </span>
                </a>
              </div>

              <!-- Footer -->
              <div
                style="text-align: center; font-size: 14px; color: #6b7280; padding-top: 20px; border-top: 1px solid #e5e7eb;"
              >
                <p style="margin: 0 0 8px;">
                  Vous avez des questions concernant cette commande ?
                </p>
                <p style="margin: 0;">
                  <a
                    href="mailto:support@artemia.com"
                    style="color: #2563eb; text-decoration: none;"
                    >Contactez notre équipe</a
                  >
                </p>
              </div>
            </div>

            <!-- Copyright -->
            <div
              style="text-align: center; padding: 20px; font-size: 12px; color: #9ca3af;"
            >
              <p style="margin: 0;">
                © ${new Date().getFullYear()} Artemia. Tous droits réservés.
              </p>
            </div>
          </div>
        `,
      },
    };

    return templates[locale] || templates.fr;
  },
  /**
   * Password Reset Email
   * @param {string} resetLink - The password reset link
   * @param {string} locale - Language preference ('fr' or 'en')
   */
  PASSWORD_RESET: (resetLink, locale = "fr") => {
    const templates = {
      fr: {
        subject: "Réinitialisation de votre mot de passe Artemia",
        html: html`
          <div
            style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;"
          >
            <div
              style="background-color: #f8f9fa; padding: 20px; text-align: center; border-bottom: 1px solid #e9ecef;"
            >
              <h1 style="color: #2c3e50; margin: 0;">
                Réinitialisation de mot de passe
              </h1>
            </div>

            <div style="padding: 30px;">
              <p>Bonjour,</p>

              <p>
                Nous avons reçu une demande de réinitialisation de mot de passe
                pour votre compte Artemia.
              </p>

              <p style="margin: 20px 0;">
                <a
                  href="${resetLink}"
                  style="background-color: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;"
                >
                  Réinitialiser mon mot de passe
                </a>
              </p>

              <p>
                Ce lien expirera dans 24 heures. Si vous n'avez pas demandé de
                réinitialisation, veuillez ignorer cet email.
              </p>

              <p style="margin-top: 30px;">
                Cordialement,<br />L'équipe Artemia
              </p>
            </div>
            <div
              style="background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; border-top: 1px solid #e9ecef;"
            >
              © ${new Date().getFullYear()} Artemia. Tous droits réservés.
            </div>
          </div>
        `,
      },
      en: {
        subject: "Reset Your Artemia Password",
        html: html`
          <div
            style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;"
          >
            <div
              style="background-color: #f8f9fa; padding: 20px; text-align: center; border-bottom: 1px solid #e9ecef;"
            >
              <h1 style="color: #2c3e50; margin: 0;">Password Reset</h1>
            </div>

            <div style="padding: 30px;">
              <p>Hello,</p>

              <p>
                We received a request to reset your Artemia account password.
              </p>

              <p style="margin: 20px 0;">
                <a
                  href="${resetLink}"
                  style="background-color: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;"
                >
                  Reset My Password
                </a>
              </p>

              <p>
                This link will expire in 24 hours. If you didn't request a
                password reset, please ignore this email.
              </p>

              <p style="margin-top: 30px;">
                Best regards,<br />The Artemia Team
              </p>
            </div>

            <div
              style="background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; border-top: 1px solid #e9ecef;"
            >
              © ${new Date().getFullYear()} Artemia. All rights reserved.
            </div>
          </div>
        `,
      },
    };
    return templates[locale] || templates.fr;
  },

  /**
   * Document Submission Confirmation
   * @param {string} sellerName - Name of the seller
   * @param {string} locale - Language preference ('fr' or 'en')
   */
  DOCUMENT_SUBMISSION: (sellerName, locale = "fr") => {
    const templates = {
      fr: {
        subject: "Confirmation de réception de vos documents – Artemia",
        html: html`
          <div
            style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6; color: #2c3e50;"
          >
            <h2 style="color: #2c3e50; margin-bottom: 20px;">
              Vos documents ont bien été reçus
            </h2>

            <p>Bonjour ${sellerName},</p>

            <p>
              Nous vous confirmons la bonne réception de vos documents. Notre
              équipe de vérification en a désormais la charge et procédera à une
              analyse rapide.
            </p>

            <div
              style="background-color: #f9fbfc; padding: 20px; margin: 20px 0; border-left: 4px solid #3498db;"
            >
              <p style="margin: 0 0 10px 0;">
                <strong>Prochaines étapes :</strong>
              </p>
              <ul style="margin: 0; padding-left: 20px;">
                <li>Contrôle de conformité par nos experts</li>
                <li>Notification dès que la vérification est terminée</li>
                <li>
                  Poursuite de votre inscription pour finaliser l’ouverture de
                  votre compte
                </li>
              </ul>
            </div>

            <p>
              En général, cette vérification est finalisée sous 48h. Une fois
              validée, vous pourrez terminer votre inscription et accéder à
              votre espace vendeur personnalisé.
            </p>

            <p style="font-size: 12px; color: #7f8c8d;">
              Une question ? Notre équipe support est disponible pour vous
              accompagner à tout moment.
            </p>

            <p>
              Merci de votre confiance,<br />
              <strong>L’équipe support vendeur Artemia</strong>
            </p>
          </div>
        `,
      },
    };
    return templates[locale] || templates.fr;
  },
  INFORMATION_REVIEW: (sellerName, locale = "fr") => {
    const templates = {
      fr: {
        subject: "Vos informations sont en cours de vérification – Artemia",
        html: html`
          <div
            style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6; color: #2c3e50;"
          >
            <h2 style="color: #2c3e50; margin-bottom: 16px;">
              Vérification de vos informations en cours
            </h2>

            <p>Bonjour ${sellerName},</p>

            <p>
              Nous vous confirmons la bonne réception de vos informations. Notre
              équipe procède actuellement à leur vérification afin de finaliser
              l’activation de votre compte vendeur.
            </p>

            <div
              style="background-color: #f9fbfc; padding: 20px; margin: 24px 0; border-left: 4px solid #2e86de; border-radius: 6px;"
            >
              <p style="margin: 0 0 12px 0; font-weight: bold;">
                Étapes suivantes :
              </p>
              <ul style="margin: 0; padding-left: 20px;">
                <li>Contrôle de vos informations et documents</li>
                <li>Validation par notre équipe de conformité</li>
                <li>Activation et accès complet à votre espace vendeur</li>
              </ul>
            </div>

            <p>
              Cette vérification est généralement finalisée sous 48 heures. Vous
              recevrez une notification par e-mail dès que votre compte sera
              activé et prêt à être utilisé.
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a
                href="https://artemia.com/vendor/dashboard"
                style="
                display: inline-block;
                background-color: #2e86de;
                color: #ffffff;
                text-decoration: none;
                padding: 12px 24px;
                border-radius: 6px;
                font-weight: bold;
              "
              >
                Accéder à votre espace vendeur
              </a>
            </div>

            <p style="font-size: 13px; color: #7f8c8d;">
              Une question ? Contactez notre
              <a
                href="mailto:support@artemia.com"
                style="color: #2e86de; text-decoration: none;"
              >
                support vendeur </a
              >.
            </p>

            <p style="font-size: 13px; color: #7f8c8d;">
              Vos informations sont traitées avec la plus grande confidentialité
              et ne seront jamais partagées avec des tiers.
            </p>

            <hr
              style="margin: 30px 0; border: none; border-top: 1px solid #e0e0e0;"
            />
            <p style="font-size: 12px; color: #7f8c8d; text-align: center;">
              Artemia © 2025 – Tous droits réservés<br />
              10, Av. Himbi, Q. Himbi Goma, Nord-Kivu, R.D. Congo
            </p>
          </div>
        `,
      },
    };
    return templates[locale] || templates.fr;
  },

  DOCUMENT_SUBMISSION: (sellerName, locale = "fr") => {
    const templates = {
      fr: {
        subject: "Documents reçus – Artemia",
        html: html`
          <div
            style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6; color: #2c3e50;"
          >
            <h2 style="color: #2c3e50;">
              Votre aventure avec Artemia est sur le point de commencer
            </h2>

            <p>Bonjour ${sellerName},</p>

            <p>
              Vos documents ont été reçus avec succès. Ils sont désormais entre
              les mains de notre équipe de vérification.
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
              Chez <strong>Artemia</strong>, nous savons que chaque minute
              compte. C’est pourquoi nous mettons tout en œuvre pour finaliser
              votre vérification dans les plus brefs délais — souvent sous 48h.
            </p>

            <p>
              Préparez-vous à rejoindre une communauté de vendeurs ambitieux, à
              bénéficier d’outils puissants, et à donner vie à votre boutique
              sur Artemia.
            </p>

            <p style="font-size: 12px; color: #7f8c8d;">
              Une question ? Un doute ? Notre équipe est prête à vous
              accompagner à tout moment.
            </p>

            <p>
              Encore un tout petit instant… et vous serez prêt à briller sur
              <strong>Artemia</strong> !<br />
              <strong>L’équipe support vendeur Artemia</strong>
            </p>
          </div>
        `,
      },
    };
    return templates[locale] || templates.fr;
  },
  ONBOARDING_COMPLETED: (sellerName, locale = "fr") => {
    const templates = {
      fr: {
        subject: "Votre compte vendeur est activé – Bienvenue sur Artemia",
        html: html`
          <div
            style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6; color: #2c3e50;"
          >
            <h2 style="color: #2c3e50; margin-bottom: 16px;">
              Félicitations ${sellerName}, votre compte est désormais actif !
            </h2>

            <p>
              Votre inscription est terminée et votre compte vendeur est
              officiellement activé. Vous pouvez dès à présent accéder à votre
              espace vendeur et commencer à configurer votre boutique.
            </p>

            <div
              style="background-color: #f9fbfc; padding: 20px; margin: 24px 0; border-left: 4px solid #27ae60; border-radius: 6px;"
            >
              <p style="margin: 0 0 12px 0; font-weight: bold;">
                Prochaines étapes :
              </p>
              <ul style="margin: 0; padding-left: 20px;">
                <li>Complétez les détails de votre boutique</li>
                <li>Mettez en ligne vos premiers produits</li>
                <li>Commencez à vendre et à toucher vos premiers clients</li>
              </ul>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a
                href="https://artemia.com/vendor/dashboard"
                style="
                display: inline-block;
                background-color: #27ae60;
                color: #ffffff;
                text-decoration: none;
                padding: 12px 24px;
                border-radius: 6px;
                font-weight: bold;
              "
              >
                Accéder à mon espace vendeur
              </a>
            </div>

            <p>
              Bienvenue dans la communauté des vendeurs Artemia. Nous sommes
              ravis de vous compter parmi nous et avons hâte de voir votre
              boutique grandir.
            </p>

            <p style="font-size: 13px; color: #7f8c8d;">
              Pour toute question, notre équipe support est à votre disposition
              :
              <a
                href="mailto:support@artemia.com"
                style="color: #27ae60; text-decoration: none;"
              >
                support@artemia.com </a
              >.
            </p>

            <hr
              style="margin: 30px 0; border: none; border-top: 1px solid #e0e0e0;"
            />
            <p style="font-size: 12px; color: #7f8c8d; text-align: center;">
              Artemia © 2025 – Tous droits réservés<br />
              10, Av. Himbi, Q. Himbi Goma, Nord-Kivu, R.D. Congo
            </p>
          </div>
        `,
      },
    };
    return templates[locale] || templates.fr;
  },
};