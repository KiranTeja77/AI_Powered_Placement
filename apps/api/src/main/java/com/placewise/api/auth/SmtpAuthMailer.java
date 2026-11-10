package com.placewise.api.auth;

import com.placewise.api.common.AppProperties;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

@Component
class SmtpAuthMailer implements AuthMailer {

    private final JavaMailSender sender;
    private final String from;

    SmtpAuthMailer(JavaMailSender sender, AppProperties props) {
        this.sender = sender;
        this.from = props.mail().from();
    }

    @Override
    public void sendPasswordReset(String toEmail, String fullName, String resetLink) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(toEmail);
        message.setSubject("Reset your PlaceWise password");
        message.setText("Hello " + fullName + ",\n\n"
                + "Use this link to choose a new password. It works once and expires in 30 minutes.\n\n"
                + resetLink + "\n\n"
                + "If you did not ask for this, you can ignore this email. Your password has not changed.\n");
        sender.send(message);
    }
}
