if curl -s -XGET http://localhost:8080/api/v0/search?firstName=Harry | grep -q 'Harry'; then
   echo "firstName: OK"
else
  echo "firstName: KO!"
fi
if curl -s -XGET http://localhost:8080/api/v0/search?lastName=Potter | grep -q 'Potter'; then
   echo "lastName: OK"
else
  echo "lastName: KO!"
fi
if curl -s  -XGET http://localhost:8080/api/v0/search?birthCountry=Fidji | grep -q 'Fidji'; then
   echo "birthCountry: OK"
else
  echo "birthCountry: KO!"
fi
if curl -s -XGET http://localhost:8080/api/v0/search?deathCountry=Colombie | grep -q 'Colombie'; then
   echo "deathCountry: OK"
else
  echo "deathCountry: KO!"
fi
if curl -s -XGET http://localhost:8080/api/v0/search?birthDate=29/02/1988 | grep -q '19880229'; then
   echo "birthDate: OK"
else
  echo "birthDate: KO!"
fi
if curl -s -XGET http://localhost:8080/api/v0/search?deathDate=29/02/1988 | grep -q '19880229'; then
   echo "deathDate: OK"
else
  echo "deathDate: KO!"
fi
if curl -s -XGET http://localhost:8080/api/v0/search?birthCity=Kuala%20Lumpur | grep -q 'Kuala Lumpur'; then
   echo "birthCity: OK"
else
  echo "birthCity: KO!"
fi
if curl -s -XGET http://localhost:8080/api/v0/search?deathCity=Le%20Caire | grep -q 'Le Caire'; then
   echo "deathCity: OK"
else
  echo "deathCity: KO!"
fi
if curl -s -XGET http://localhost:8080/api/v0/search?birthDepartment=57 | grep -q '57'; then
   echo "birthDepartment: OK"
else
  echo "birthDepartment: KO!"
fi
if curl -s -XGET http://localhost:8080/api/v0/search?deathDepartment=75 | grep -q '75'; then
   echo "deathDepartment: OK"
else
  echo "deathDepartment: KO!"
fi
