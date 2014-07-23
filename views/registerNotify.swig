{% extends 'layout.swig' %}

{% block body %}
A verification e-mail has been sent to <strong>{{ user.email }}</strong>.
Please check your E-Mail and click on the verification link inside the E-Mail
to verify your account.  If you do not get a verification E-Mail within a few
minutes, please check your spam folder.
{% endblock %}
