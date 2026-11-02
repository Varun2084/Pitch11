"""One-off: writes data/auction/*.csv from the verified source tables. CSVs are the maintained record."""
import csv, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[1] / "data" / "auction"
T = dict(CSK="CSK", DC="DC", GT="GT", KKR="KKR", LSG="LSG", MI="MI", PBKS="PBKS", RR="RR", RCB="RCB", SRH="SRH")
def pr(s):
    s = s.strip().lower().replace("crore", "").strip()
    if "l" in s: return round(float(s.replace("lakhs","").replace("lakh","").replace("l","").strip())/100, 3)
    return float(s)
ipl25 = """CSK|Noor Ahmad|10|2;Ravichandran Ashwin|9.75|2;Devon Conway|6.25|2;Khaleel Ahmed|4.8|2;Rachin Ravindra*|4|1.5;Anshul Kamboj|3.4|.3;Rahul Tripathi|3.4|.75;Sam Curran|2.4|2;Gurjapneet Singh|2.2|.3;Nathan Ellis|2|1.25;Deepak Hooda|1.7|.75;Jamie Overton|1.5|1.5;Vijay Shankar|1.2|.3;Vansh Bedi|.55|.3;Andre Siddarth|.3|.3;Ramakrishna Ghosh|.3|.3;Shaik Rasheed|.3|.3;Mukesh Choudhary|.3|.3;Kamlesh Nagarkoti|.3|.3;Shreyas Gopal|.3|.3
DC|KL Rahul|14|2;Mitchell Starc|11.75|2;T Natarajan|10.75|2;Jake Fraser-McGurk*|9|2;Mukesh Kumar*|8|2;Harry Brook|6.25|2;Ashutosh Sharma|3.8|.3;Mohit Sharma|2.2|.5;Faf du Plessis|2|2;Sameer Rizvi|.75|.3;Donovan Ferreira|.75|.75;Dushmantha Chameera|.75|.75;Vipraj Nigam|.5|.3;Karun Nair|.5|.3;Madhav Tiwari|.4|.3;Manvanth Kumar|.3|.3;Tripurana Vijay|.3|.3;Darshan Nalkande|.3|.3;Ajay Mandal|.3|.3
GT|Jos Buttler|15.75|2;Mohammed Siraj|12.25|2;Kagiso Rabada|10.75|2;Prasidh Krishna|9.5|2;Washington Sundar|3.2|2;Sherfane Rutherford|2.6|1.5;Gerald Coetzee|2.4|1.25;Mahipal Lomror|1.7|.5;Gurnoor Brar|1.3|.3;Arshad Khan|1.3|.3;Ishant Sharma|.75|.75;Kumar Kushagra|.65|.3;Nishant Sindhu|.3|.3;Manav Suthar|.3|.3;Anuj Rawat|.3|.3;Glenn Phillips|2|2;Karim Janat|.75|.75;Jayant Yadav|.75|.75;Kulwant Khejroliya|.3|.3;Sai Kishore|2|.75
KKR|Venkatesh Iyer|23.75|2;Anrich Nortje|6.5|2;Quinton de Kock|3.6|2;Angkrish Raghuvanshi|3|.3;Rahmanullah Gurbaz|2|2;Vaibhav Arora|1.8|.3;Rovman Powell|1.5|1.5;Manish Pandey|.75|.75;Spencer Johnson|2.8|2;Mayank Markande|.3|.3;Moeen Ali|2|2;Luvnith Sisodia|.3|.3;Anukul Roy|.4|.3;Ajinkya Rahane|1.5|1.5;Umran Malik|.75|.75
LSG|Rishabh Pant|27|2;Avesh Khan|9.75|2;Akash Deep|8|1;David Miller|7.5|1.5;Abdul Samad|4.2|.3;Mitchell Marsh|3.4|2;Aiden Markram|2|2;Manimaran Siddharth|.75|.3;Shamar Joseph|.75|.75;Digvesh Singh|.3|.3;Shahbaz Ahmed|2.4|1;Matthew Breetzke|.75|.75;Arshin Kulkarni|.3|.3;Prince Yadav|.3|.3;Yuvraj Chaudhary|.3|.3;Akash Singh|.3|.3;Rajvardhan Hangargekar|.3|.3;Aryan Juyal|.3|.3;Himmat Singh|.3|.3
MI|Trent Boult|12.5|2;Deepak Chahar|9.25|2;Naman Dhir|5.25|.3;Will Jacks|5.25|2;Allah Ghazanfar|4.8|.75;Mitchell Santner|2|2;Ryan Rickelton|1|1;Reece Topley|.75|.75;Lizaad Williams|.75|.75;Robin Minz|.65|.3;Karn Sharma|.5|.5;Vignesh Puthur|.3|.3;Bevon Jacobs|.3|.3;Satyanarayana Raju|.3|.3;Raj Bawa|.3|.3;Ashwani Kumar|.3|.3;Arjun Tendulkar|.3|.3;Krishnan Shrijith|.3|.3
PBKS|Shreyas Iyer|26.75|2;Arshdeep Singh|18|2;Yuzvendra Chahal|18|2;Marcus Stoinis|11|2;Marco Jansen|7|1.75;Nehal Wadhera|4.2|.3;Glenn Maxwell|4.2|2;Priyansh Arya|3.8|.3;Josh Inglis|2.6|2;Azmatullah Omarzai|2.4|1.5;Lockie Ferguson|2|2;Vijaykumar Vyshak|1.8|.3;Yash Thakur|1.6|.4;Harpreet Brar|1.5|.3;Aaron Hardie|1.25|1.25;Vishnu Vinod|.95|.3;Kuldeep Sen|.8|.75;Xavier Bartlett|.8|.75;Suryansh Shedge|.3|.3;Pyla Avinash|.3|.3;Musheer Khan|.3|.3;Harnoor Singh|.3|.3;Pravin Dubey|.3|.3
RR|Jofra Archer|12.5|2;Tushar Deshpande|6.5|1;Wanindu Hasaranga|5.25|2;Maheesh Theekshana|4.4|2;Nitish Rana|4.2|1.5;Fazalhaq Farooqi|2|2;Kwena Maphaka|1.5|.75;Akash Madhwal|1.2|.3;Vaibhav Suryavanshi|1.1|.3;Shubham Dubey|.8|.3;Yudhvir Singh|.35|.3;Kunal Rathore|.3|.3;Ashok Sharma|.3|.3;Kumar Kartikeya|.3|.3
RCB|Josh Hazlewood|12.5|2;Phil Salt|11.5|2;Jitesh Sharma|11|1;Bhuvneshwar Kumar|10.75|2;Liam Livingstone|8.75|2;Rasikh Salam|6|.3;Krunal Pandya|5.75|2;Tim David|3|2;Suyash Sharma|2.6|.3;Jacob Bethell|2.6|1.25;Devdutt Padikkal|2|2;Nuwan Thushara|1.6|.75;Romario Shepherd|1.5|1.5;Lungi Ngidi|1|1;Swapnil Singh|.5|.3;Abhinandan Singh|.3|.3;Swastik Chikara|.3|.3;Mohit Rathee|.3|.3;Manoj Bhandage|.3|.3
SRH|Ishan Kishan|11.25|2;Mohammed Shami|10|2;Harshal Patel|8|2;Rahul Chahar|3.2|1;Abhinav Manohar|3.2|.3;Adam Zampa|2.4|2;Simarjeet Singh|1.5|.3;Eshan Malinga|1.2|.3;Brydon Carse|1|1;Jaydev Unadkat|1|1;Kamindu Mendis|.75|.75;Zeeshan Ansari|.4|.3;Aniket Verma|.3|.3;Atharva Taide|.3|.3;Sachin Baby|.3|.3"""
ipl26 = """DC|David Miller|2|2;Pathum Nissanka|4|.75;Sahil Parakh|.3|.3;Prithvi Shaw|.75|;Lungi Ngidi|2|2;Kyle Jamieson|2|;Ben Duckett|2|2;Auqib Nabi|8.4|.3
KKR|Cameron Green|25.2|2;Rahul Tripathi|.75|.75;Matheesha Pathirana|18|2;Kartik Tyagi|.3|.3;Prashant Solanki|.3|.3;Mustafizur Rahman|9.2|2;Akash Deep|1|1;Sarthak Ranjan|.3|.3;Daksh Kamra|.3|.3;Rachin Ravindra|2|2;Finn Allen|2|2;Tejasvi Singh|3|.3;Tim Seifert|1.5|1.5
MI|Danish Malewar|.3|.3;Mohammad Izhar|.3|.3;Atharva Ankolekar|.3|.3;Mayank Rawat|.3|.3;Quinton de Kock|1|1
LSG|Akshat Raghuwanshi|2.2|.3;Anrich Nortje|2|2;Naman Tiwari|1|.3;Wanindu Hasaranga|2|2;Mukul Choudhary|2.6|.3;Josh Inglis|8.6|2
CSK|Sarfaraz Khan|.75|.75;Akeal Hosein|2|2;Matt Henry|2|2;Rahul Chahar|5.2|1;Prashant Veer|14.2|.3;Matthew Short|1.5|1.5;Aman Khan|.4|.3;Zak Foulkes|.75|;Kartik Sharma|14.2|.3
RR|Aman Rao|.3|.3;Ravi Bishnoi|7.2|2;Sushant Mishra|.9|.3;Yash Raj Punja|.3|.3;Vignesh Puthur|.3|.3;Brijesh Sharma|.3|.3;Adam Milne|2.4|;Kuldeep Sen|.75|;Ravi Singh|.95|.3
RCB|Vihaan Malhotra|.3|;Jacob Duffy|2|2;Venkatesh Iyer|7|2;Satvik Deswal|.3|.3;Mangesh Yadav|5.2|.3;Vicky Ostwal|.3|;Kanishk Chouhan|.3|;Jordan Cox|.75|.75
GT|Ashok Sharma|.9|.3;Prithvi Raj Yarra|.3|;Luke Wood|.75|;Jason Holder|7|2;Tom Banton|2|
SRH|Sakib Hussain|.3|.3;Onkar Tarmale|.3|.3;Amit Kumar|.3|.3;Praful Hinge|.3|.3;Shivam Mavi|.75|.75;Shivang Kumar|.3|.3;Krains Fuletra|.3|.3;Liam Livingstone|13|2;Jack Edwards|3|.5;Salil Arora|1.5|.3
PBKS|Pravin Dubey|.3|.3;Vishal Nishad|.3|.3;Cooper Connolly|3|2;Ben Dwarshuis|4.4|1"""
wpl26 = """GG|Ayushi Soni|.3|.3;Danni Wyatt-Hodge|.5|.5;Shivani Singh|.1|.1;Yastika Bhatia|.5|.3;Anushka Sharma|.45|.1;Georgia Wareham|1|.5;Tanuja Kanwer|.45|.3;Kanika Ahuja|.3|.3;Rajeshwari Gayakwad|.4|.4;Kashvee Gautam|.65|.3;Kim Garth|.5|.5;Happy Kumari|.1|.1;Titas Sadhu|.3|.3;Bharti Fulmali|.7|.3;Renuka Singh|.6|.4;Sophie Devine|2|.5
RCB|Dayalan Hemalatha|.3|.3;Gautami Naik|.1|.1;Pooja Vastrakar|.85|.5;Arundhati Reddy|.75|.3;Prathyoosha Kumar|.1|.1;Prema Rawat|.2|.1;Linsey Smith|.3|.3;Lauren Bell|.9|.3;Radha Yadav|.65|.3;Nadine de Klerk|.65|.3;Grace Harris|.75|.3;Georgia Voll|.6|.4
MI|Nalla Reddy|.1|.1;Triveni Vasistha|.2|.2;Nicola Carey|.3|.3;Rahila Firdous|.1|.1;Poonam Khemnar|.1|.1;Sajeevan Sajana|.75|.3;Milly Illingworth|.1|.1;Sanskriti Gupta|.2|.2;Saika Ishaque|.3|.3;Shabnim Ismail|.6|.4;Amelia Kerr|3|.5
UPW|Shweta Meena|.1|.1;Chloe Tryon|.3|.3;Simran Shaikh|.1|.1;Pratika Rawal|.5|.5;Tara Norris|.1|.1;Shikha Pandey|2.4|.4;Deandra Dottin|.8|.5;Shipra Giri|.1|.1;Gongadi Trisha|.1|.1;Asha Sobhana|1.1|.3;Kranti Gaud|.5|.5;Harleen Deol|.5|.5;Kiran Navgire|.6|.4;Phoebe Litchfield|1.2|.5;Meg Lanning|1.9|.5;Sophie Ecclestone|.85|.5;Deepti Sharma*|3.2|.5
DC|Lucy Hamilton|.1|.1;Taniya Bhatia|.3|.3;Minnu Mani|.4|.4;Nandni Sharma|.2|.2;Mamatha Madiwala|.1|.1;Deeya Yadav|.1|.1;Lizelle Lee|.3|.3;Sneh Rana|.5|.3;Shree Charani|1.3|.3;Chinelle Henry|1.3|.3;Laura Wolvaardt|1.1|.3"""
wpl27 = """DC|Kiran Navgire|.75|.4;Uma Kashvi|.1|.1;Kirstie Gordon|.1|.1;Nazma Khan|.1|.1
GG|G Kamalini|.4|.4;Orla Prendergast|.3|.3;Samaira Raghav|.1|.1
MI|Disha Kasat|.1|.1;Saanika Chalke|.1|.1;Shweta Sehrawat|.2|.1;Bharti Rawal|.1|.1;Akshita Bhagat|.1|.1;Latika Inamdar|.1|.1
RCB|Tejal Hasabnis|.3|.3;Vrinda Dinesh|.1|.1;Jess Jonassen|.4|.4;Chloe Tryon|.3|.3
UPW|Asha Sobhana|.3|.3;Sophie Molineux|1.1|.5;Sneh Rana|.3|.3;Grace Harris|.3|.3;Kathryn Bryce|.1|.1;Manali Dakshini|.1|.1;Sahana Pawar|.1|.1;Sushma Verma|.3|.3"""
SRC = {
 ("IPL",2025):("2024-11-24","Jeddah","https://www.crictracker.com/cricket-news/ipl-2025-complete-list-of-sold-players-from-ipl-2025-mega-auction",ipl25),
 ("IPL",2026):("2025-12-16","Abu Dhabi","https://www.outlookindia.com/sports/cricket/indian-premier-league-2026-mini-auction-sold-unsold-players-list",ipl26),
 ("WPL",2026):("2025-11-27","New Delhi","https://khelnow.com/cricket/wpl-2026-mega-auction-sold-players-202511",wpl26),
 ("WPL",2027):("2026-10-28","Kochi","https://khelnow.com/cricket/wpl-2027-auction-sold-unsold-players-list-202610",wpl27),
}
ROOT.mkdir(parents=True, exist_ok=True)
with open(ROOT/"sold.csv","w",newline="") as f:
    w=csv.writer(f); w.writerow("league season auction_date venue team player base_cr price_cr rtm source".split())
    for (lg,s),(d,v,u,t) in SRC.items():
        n=0
        for line in t.splitlines():
            team,rest=line.split("|",1)
            for e in rest.split(";"):
                p,price,base=e.split("|"); rtm=p.endswith("*"); w.writerow([lg,s,d,v,team,p.rstrip("*"),float(base) if base else "",float(price),int(rtm),u]); n+=1
        print(lg,s,n)
