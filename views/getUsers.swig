{% extends 'layout.swig' %}

{% block body %}
<h2>User Directory</h2>
{% if users %}
<table class="table">
	<thead>
		<tr>
			<th>Gravatar</th>
			<th>Clan</th>
			<th>Username</th>
			<th>Country</th>
			<th>Last Seen</th>
	</thead>
	<tbody>
		{% for user in users %}
		<tr>
			<td><img src="//www.gravatar.com/avatar/{{ user.getGravatar() }}?d=identicon"></td>
			<td>{{ user.profile.clan }}</td>
			<td><a href="/users/{{ user.username }}">{{ user.profile.username }}</a></td>
			<td>{{ user.profile.country }}</td>
			<td>{{ user.seen }}</td>
		</tr>
		{% endfor %}
	</tbody>
</table>
{% else %}
<p>No users found.</p>
{% endif %}
{% endblock %}
