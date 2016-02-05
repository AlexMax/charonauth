{% import './macros.swig' as macros %}
{% extends 'layout.swig' %}

{% block body %}
{{ macros.usernav(username, 'actions', tabs) }}
{% if actions %}
<table class="table">
	<thead>
		<tr>
			<th>Date and Time</th>
			<th>Action</th>
			<th>IP Address</th>
	</thead>
	<tbody>
		{% for action in actions %}
		<tr>
			<td><a href="/users/{{ username }}/actions/{{ action.id }}">{{ action.createdAt|date }}</a></td>
			<td>{{ action.getPrettyType() }}</td>
			<td>{{ action.ip|ip }}</td>
		</tr>
		{% endfor %}
	</tbody>
</table>
{{ macros.paginator(pinfo) }}
<p>
	Note that the Authentication IP Address is for the server the user
	authenticated on, as the server cannot be trusted to report the user's IP
	address accurately.
</p>
{% else %}
<p>No actions found.</p>
{% endif %}
{% endblock %}
